import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Cookie の読み書き (getAll / setAll) は共通の createClient に集約。
    const supabase = await createClient();

    // Supabase セッションをクリア。scope を省略するとデフォルトの 'global' に
    // なり、全デバイスのリフレッシュトークンが失効してしまう (iOS では
    // Safari と PWA が別セッションのため、片方のログアウトがもう片方を
    // 巻き込む)。クライアント側 (authStore.signOut) と同じく 'local' に揃える。
    await supabase.auth.signOut({ scope: 'local' });

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
