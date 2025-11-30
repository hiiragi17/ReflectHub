import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Silent failure
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
            } catch {
              // Silent failure
            }
          },
        },
      }
    );

    // Supabase セッションをクリア
    await supabase.auth.signOut();

    // レスポンスを作成してクッキーをクリア
    const response = NextResponse.json({ success: true });

    // セッション関連のクッキーを削除
    response.cookies.delete('session-set');

    // Supabase の認証クッキーも削除
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name);
      }
    });

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Logout failed', details: String(error) },
      { status: 500 }
    );
  }
}
