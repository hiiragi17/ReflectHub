'use client';

import { useCallback, useSyncExternalStore } from 'react';

const subscribeOnlineStatus = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const getEffectiveType = (): string | null =>
  (navigator as unknown as { connection?: { effectiveType: string } }).connection
    ?.effectiveType ?? null;

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    () => navigator.onLine,
    () => true,
  );
  // 回線種別は online/offline イベントのタイミングで読み直す(従来と同じ更新契機)
  const effectiveType = useSyncExternalStore(
    subscribeOnlineStatus,
    getEffectiveType,
    () => null,
  );

  const isSlowConnection =
    !isOnline || effectiveType === '2g' || effectiveType === '3g';

  return { isOnline, isSlowConnection };
}

/**
 * Hook for network error handling with automatic retry
 */
export function useNetworkErrorHandler() {
  const { isOnline } = useNetworkStatus();

  const withErrorHandling = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      if (!isOnline) {
        throw new Error('ネットワークに接続していません。');
      }

      try {
        return await operation();
      } catch (error) {
        if (!navigator.onLine) {
          throw new Error('ネットワーク接続が失われました。');
        }
        throw error;
      }
    },
    [isOnline]
  );

  return { withErrorHandling, isOnline };
}
