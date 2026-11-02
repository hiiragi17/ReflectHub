'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';
import { clearAppBadge } from '@/lib/pwa/badge';

/**
 * クライアント側で Service Worker を登録するためのマウント専用コンポーネント。
 * UI は描画しない。
 *
 * あわせて、アプリを開いたとき・画面が再び表示されたときに、
 * プッシュ通知で付いたアプリアイコンのバッジを消す。
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    void clearAppBadge();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void clearAppBadge();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return null;
}

export default ServiceWorkerProvider;
