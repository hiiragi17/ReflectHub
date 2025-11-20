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
          console.log('[auth/callback] Code found, exchanging for session');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('コード交換エラー:', exchangeError);
            router.push('/auth?error=callback_error');
            return;
          }
          console.log('[auth/callback] Code exchange successful');
          router.push(next);
          return;
        }

        console.log('[auth/callback] No code found, checking session with fragment-based flow');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('セッション取得エラー:', error);
          router.push('/auth?error=callback_error');
          return;
        }

        if (data.session) {
          console.log('[auth/callback] Session found via fragment-based flow');
          router.push(next);
        } else {
          console.log('[auth/callback] No session found');
          router.push('/auth');
        }
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
