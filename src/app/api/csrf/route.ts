import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, generateCSRFToken } from '@/utils/csrfToken';

/**
 * GET /api/csrf
 *
 * Double Submit Cookie 用の CSRF トークンを発行する。
 * - レスポンス body に token を返す（クライアントはこれを X-CSRF-Token ヘッダに載せる）
 * - 同じ token を HttpOnly でない Cookie として設定する（サーバ側で突き合わせ検証する）
 */
export async function GET() {
  let token: string;
  try {
    token = generateCSRFToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CSRF token generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.json({ token });
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
