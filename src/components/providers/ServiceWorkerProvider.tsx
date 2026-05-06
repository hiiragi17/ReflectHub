'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';

/**
 * クライアント側で Service Worker を登録するためのマウント専用コンポーネント。
 * UI は描画しない。
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}

export default ServiceWorkerProvider;
