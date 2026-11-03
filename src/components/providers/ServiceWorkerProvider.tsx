'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';
import { clearAppBadge } from '@/lib/pwa/badge';

/**
 * クライアント側で Service Worker を登録するためのマウント専用コンポーネント。
 * UI は描画しない。
 *
 * あわせて、アプリを見たとき (表示された状態で開いたとき、画面が再び表示されたとき) に、
 * プッシュ通知で付いたアプリアイコンのバッジを消す。
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  useEffect(() => {
    // 見ていない (背景のタブで読み込まれた、復元されたなど) 間は、消さない。
    // 画面が表示されたときに、visibilitychange で消す。
    const clearIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void clearAppBadge();
      }
    };

    clearIfVisible();
    document.addEventListener('visibilitychange', clearIfVisible);
    return () => document.removeEventListener('visibilitychange', clearIfVisible);
  }, []);

  return null;
}

export default ServiceWorkerProvider;
