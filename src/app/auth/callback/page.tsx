'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/apiClient';

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
          if (exchangeError) {
            const { data: fallback } = await supabase.auth.getSession();
            session = fallback.session;
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