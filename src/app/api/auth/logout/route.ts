import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LogoutSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // ボディなしの呼び出し (従来のクライアント) はこの端末のみのログアウトとして扱う。
    const rawBody = await request.text();
    let scope: 'local' | 'global' = 'local';
    if (rawBody.trim() !== '') {
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      const parsed = LogoutSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? 'Validation failed' },
          { status: 400 },
        );
      }
      scope = parsed.data.scope;
    }

    const cookieStore = await cookies();
    // Cookie の読み書き (getAll / setAll) は共通の createClient に集約。
    const supabase = await createClient();

    // Supabase セッションをクリア。scope を省略するとデフォルトの 'global' に
    // なり、全デバイスのリフレッシュトークンが失効してしまう (iOS では
    // Safari と PWA が別セッションのため、片方のログアウトがもう片方を
    // 巻き込む)。通常は 'local' とし、利用者が「すべての端末からログアウト」を
    // 明示したときだけ 'global' にする。
    // 'global' の失効に失敗した場合はエラーを返し、クライアントに再試行させる
    // (Cookie を消して成功扱いにすると、他端末のセッションが残ったまま気づけない)。
    //
    // supabase-js は、セッションがない・リモートが 401/403/404 のとき、リモートの失効を
    // 行わずにエラーなしで返す。'global' ではそれを成功と区別できないため、先にトークンを
    // サーバーで検証 (getUser) し、有効なセッションがあるときだけ失効を実行する。
    if (scope === 'global') {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return NextResponse.json({ error: 'No valid session' }, { status: 401 });
      }
    }
    const { error: signOutError } = await supabase.auth.signOut({ scope });
    if (signOutError && scope === 'global') {
      console.error('Global logout error:', signOutError);
      return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }

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
