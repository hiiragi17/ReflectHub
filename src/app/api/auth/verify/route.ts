import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Cookie の読み書き (getAll / setAll) は共通の createClient に集約。
    const supabase = await createClient();

    // getSession() は Cookie の中身を検証せずに返すため、署名を検証する getClaims() を使う
    // (middleware と同じ)。非対称鍵の JWT ならローカルで検証でき、認証サーバーへの
    // 往復は増えない。
    const { data: claimsData, error } = await supabase.auth.getClaims();

    if (error) {
      return NextResponse.json(
        { authenticated: false, error: error.message },
        { status: 200 }
      );
    }

    const claims = claimsData?.claims;

    if (claims?.sub) {
      const userId = claims.sub;
      // クライアントの初期化 (authStore.initialize) が verify に続けて
      // /api/auth/profile/{id} を直列で叩いていた 2 往復を 1 往復に短縮する
      // ため、ここでプロフィールも一緒に返す。プロフィールはログイン時
      // (/api/auth/session POST) に作成済みで、RLS により自分の行のみ取得
      // される。取得に失敗しても認証自体は成立しているので、profile は
      // null で返し、クライアント側は session.user 情報でフォールバックする。
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let resolvedProfile = profile ?? null;

      // プロフィール行が存在しない (PGRST116 = 0 行) 場合は、従来
      // initialize が叩いていた /api/auth/profile/{id} GET の create-on-miss
      // と同じ自己修復をここで行う。これが無いと、ログイン時の
      // /api/auth/session insert が失敗して握り潰された等でプロフィール行が
      // 無いユーザーが、合成名のまま初期化され、プロフィールページを開くまで
      // 行が作られない状態になる。
      if (!resolvedProfile && profileError?.code === 'PGRST116') {
        const meta = claims.user_metadata ?? {};
        const name =
          meta.full_name ||
          meta.name ||
          claims.email?.split('@')[0] ||
          'ユーザー';

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: claims.email,
            name,
            provider: 'google',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        resolvedProfile = createdProfile ?? null;
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: userId,
          email: claims.email,
        },
        profile: resolvedProfile,
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
