import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  verifyCSRFAsync,
} from '@/utils/csrfTokenEdge';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF 検証を免除するパス。
 * - `/api/csrf`: トークン発行エンドポイント (GET のみだが念のため)
 * - `/api/auth/session`: OAuth コールバック page (`/auth/callback`) から POST されて
 *   サーバ Cookie を確立するエンドポイント。CSRF トークン取得前に呼ばれる可能性があるため免除
 * - `/api/cron/*`: Vercel Cron からの呼び出し。`Authorization: Bearer ${CRON_SECRET}` で別途認証
 * - `/api/logs/errors`: クライアント側エラーロギング。`navigator.sendBeacon` から
 *   呼ばれるとカスタムヘッダを付与できないため CSRF 強制は外す。サーバ側で
 *   `user_id` をセッションから決定し、ボディの値を信用しない実装になっている。
 */
const CSRF_EXEMPT_PATHS: ReadonlyArray<string> = [
  '/api/csrf',
  '/api/auth/session',
  '/api/cron/',
  '/api/logs/errors',
];

/**
 * Supabase セッション保護 (`/auth` への redirect) を免除するパス。
 *
 * これらは route ハンドラ側で個別に認証する設計のため、middleware で
 * 未ログイン時に `/auth` へリダイレクトしてしまうと、Vercel Cron や
 * 未認証クライアント (sendBeacon / OAuth 確立中 / CSRF トークン取得)
 * から API に到達できなくなる。
 *
 * - `/api/cron/*`: `Authorization: Bearer ${CRON_SECRET}` で route 内認証
 * - `/api/auth/session`: OAuth フロー中で Cookie 確立前に POST される
 * - `/api/csrf`: 認証前にトークン取得する必要あり
 * - `/api/logs/errors`: 未ログインクラッシュも記録するため anon でも受け付け
 */
const SESSION_EXEMPT_PATHS: ReadonlyArray<string> = [
  '/api/csrf',
  '/api/auth/session',
  '/api/cron/',
  '/api/logs/errors',
];

function matchesPathList(pathname: string, list: ReadonlyArray<string>): boolean {
  return list.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p));
}

function isCSRFExempt(pathname: string): boolean {
  return matchesPathList(pathname, CSRF_EXEMPT_PATHS);
}

function isSessionExempt(pathname: string): boolean {
  return matchesPathList(pathname, SESSION_EXEMPT_PATHS);
}

/**
 * リダイレクト用レスポンスへ、Supabase がリフレッシュ時に書き込んだ
 * Set-Cookie を引き継ぐ。これを忘れると、更新済みトークンがブラウザに
 * 届かず旧リフレッシュトークンが再利用され、ローテーション失効で
 * 強制ログアウトされる。
 */
function withSessionCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function middleware(request: NextRequest) {
  // /api/* かつ mutation メソッドの場合は CSRF を先に検証する。
  // Supabase セッション初期化より前に走らせて、未認証でも同じ 403 で弾く。
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') &&
    MUTATING_METHODS.has(request.method) &&
    !isCSRFExempt(pathname)
  ) {
    const result = await verifyCSRFAsync(
      request.headers.get(CSRF_HEADER_NAME),
      request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null,
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: 'CSRF validation failed', reason: result.reason },
        { status: 403 },
      );
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware');
    return response;
  }

  if (request.nextUrl.pathname === '/auth/callback') {
    return response;
  }

  // Cookie の読み書きは getAll / setAll で行う (@supabase/ssr の現行推奨)。
  // 旧 get / set / remove API は、セッション Cookie がチャンク分割
  // (sb-xxx-auth-token.0 / .1) された場合に set が複数回呼ばれ、その度に
  // response を作り直す実装だと先に書いたチャンクが失われる。壊れた
  // セッション Cookie がブラウザに残り、ランダムなログアウトを引き起こす
  // (特にトークン期限切れ後の PWA 再開時は middleware がリフレッシュを
  // 担うため、毎回この経路を踏んでいた)。
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // setAll は全 Cookie を一括で受け取るため、response の再生成は
          // 1 回で済み、書き込みが欠落しない。
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    // getSession() は cookie の内容を検証せずに返すため、ルート保護には
    // トークン検証を伴う getClaims() を使う (Supabase 推奨)。期限切れ時の
    // セッションリフレッシュ (setAll 経由の Cookie 更新) もここで走る。
    const { data: claimsData, error } = await supabase.auth.getClaims();
    const claims = claimsData?.claims ?? null;

    if (error) {
      console.error('Middleware session error:', error);
    }

    const publicRoutes = [
      '/auth',
      '/auth/callback',
      '/'
    ];

    const isPublicRoute = publicRoutes.some(route =>
      route === '/'
        ? request.nextUrl.pathname === '/'
        : request.nextUrl.pathname.startsWith(route)
    );

    // session 認証を route ハンドラ側に委譲する API パス
    // (Cron / sendBeacon / OAuth callback / CSRF 取得など)。
    const isProtectedRoute = !isPublicRoute && !isSessionExempt(request.nextUrl.pathname);

    if (isProtectedRoute && !claims) {
      const redirectUrl = new URL('/auth', request.url);
      const nextPath = request.nextUrl.pathname + request.nextUrl.search;
      redirectUrl.searchParams.set('next', nextPath);

      return withSessionCookies(NextResponse.redirect(redirectUrl), response);
    }

    if (request.nextUrl.pathname === '/auth' && claims) {
      const rawNext = request.nextUrl.searchParams.get('next') || '/dashboard';
      const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//')
        ? rawNext
        : '/dashboard';

      return withSessionCookies(
        NextResponse.redirect(new URL(safeNext, request.url)),
        response,
      );
    }
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};