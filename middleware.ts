import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  // /auth/callback パスの場合は認証処理をスキップ
  if (request.nextUrl.pathname === '/auth/callback') {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const value = request.cookies.get(name)?.value;
          return value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  try {
    // セッション状態を確認してリフレッシュ
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Middleware session error:', error);
    }

    // 認証が必要なルートの保護
    const protectedRoutes = ['/', '/reflection', '/history', '/settings', '/analysis'];
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute && !session) {
      // 未認証ユーザーをログインページにリダイレクト
      const redirectUrl = new URL('/auth', request.url);
      const nextPath = request.nextUrl.pathname + request.nextUrl.search;
      redirectUrl.searchParams.set('next', nextPath);
      
      return NextResponse.redirect(redirectUrl, { headers: response.headers });
    }

    // ログイン済みユーザーがログインページにアクセスした場合
    if (request.nextUrl.pathname === '/auth' && session) {
      const rawNext = request.nextUrl.searchParams.get('next') || '/';
      const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') 
        ? rawNext 
        : '/';
      
      return NextResponse.redirect(new URL(safeNext, request.url), {
        headers: response.headers,
      });
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