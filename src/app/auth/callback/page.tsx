'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/apiClient';

/**
 * アクセストークンの発行時刻 (iat) が「たった今」かを判定する。
 * コード交換失敗時のフォールバックで、このコールバック処理中に
 * 自動交換で発行されたセッションだけを救済し、別アカウントの
 * 残留セッションを誤ってログイン成功扱いしないために使う。
 */
function isFreshlyIssuedSession(session: Session): boolean {
  try {
    const b64url = session.access_token.split('.')[1] ?? '';
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
    ) as { iat?: unknown };
    return (
      typeof payload.iat === 'number' &&
      Math.abs(Date.now() / 1000 - payload.iat) <= 120
    );
  } catch {
    return false;
  }
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const next = url.searchParams.get('next') || '/dashboard';

        if (code) {
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          let session = sessionData?.session ?? null;

          // createBrowserClient は detectSessionInUrl により URL の code を
          // 自動交換することがあり、その場合ここでの手動交換は「code 使用済み」で
          // 失敗する。セッション自体は確立しているため getSession() にフォール
          // バックし、後続の POST /api/auth/session (サーバー Cookie 確立と
          // プロフィール名の補正) を必ず実行する。
          // ただし、期限切れリンクや別ブラウザで開いた場合など自動交換以外の
          // 失敗では、getSession() が「以前のユーザー」の残留セッションを返し
          // 得る。それを成功扱いするとアカウント切り替え失敗が旧アカウント
          // 継続に化けるため、直近に発行されたセッションのみ救済する。
          if (exchangeError) {
            const { data: fallback } = await supabase.auth.getSession();
            session =
              fallback.session && isFreshlyIssuedSession(fallback.session)
                ? fallback.session
                : null;
            if (!session) {
              console.error('コード交換エラー:', exchangeError);
              router.push('/auth?error=callback_error');
              return;
            }
          }

          // Googleから取得したユーザー情報をログ出力（開発環境のみ）
          if (process.env.NODE_ENV === 'development' && session?.user) {
            console.log('Google user_metadata:', session.user.user_metadata);
            console.log('User name from Google:',
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              'No name found');
          }

          // サーバー側のセッションを設定
          if (session) {
            try {
              const response = await apiFetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }),
              });

              if (!response.ok) {
                console.error('サーバーセッション設定エラー:', await response.text());
                router.push('/auth?error=session_error');
                return;
              }
            } catch (sessionError) {
              console.error('サーバーセッション設定エラー:', sessionError);
              router.push('/auth?error=session_error');
              return;
            }
          }

          router.push(next);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('セッション取得エラー:', error);
          router.push('/auth?error=callback_error');
          return;
        }
        router.push(data.session ? next : '/auth');
      } catch (err) {
        console.error('予期しないエラー:', err);
        router.push('/auth?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">ログイン処理中...</p>
      </div>
    </div>
  );
}