import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Cookie の読み書き (getAll / setAll) は共通の createClient に集約。
    const supabase = await createClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { authenticated: false, error: error.message },
        { status: 200 }
      );
    }

    if (session?.user) {
      // クライアントの初期化 (authStore.initialize) が verify に続けて
      // /api/auth/profile/{id} を直列で叩いていた 2 往復を 1 往復に短縮する
      // ため、ここでプロフィールも一緒に返す。プロフィールはログイン時
      // (/api/auth/session POST) に作成済みで、RLS により自分の行のみ取得
      // される。取得に失敗しても認証自体は成立しているので、profile は
      // null で返し、クライアント側は session.user 情報でフォールバックする。
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        profile: profile ?? null,
      });
    }

    return NextResponse.json({
      authenticated: false,
      message: 'No active session'
    });

  } catch {
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
