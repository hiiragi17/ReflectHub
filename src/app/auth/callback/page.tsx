'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

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
          if (exchangeError) {
            console.error('コード交換エラー:', exchangeError);
            router.push('/auth?error=callback_error');
            return;
          }

          // サーバー側のセッションを設定
          if (sessionData.session) {
            try {
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  access_token: sessionData.session.access_token,
                  refresh_token: sessionData.session.refresh_token,
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