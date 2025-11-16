'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(typeof window !== 'undefined' && navigator.onLine);

    // Handle online/offline events
    const handleOnline = (): void => {
      setIsOnline(true);
      setIsSlowConnection(false);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed
    const checkConnectionSpeed = (): void => {
      if (!navigator.onLine) {
        setIsSlowConnection(true);
        return;
      }

      const connection =
        (navigator as unknown as { connection?: { effectiveType: string } })
          .connection || null;
      if (connection) {
        const effectiveType = connection.effectiveType;
        setIsSlowConnection(effectiveType === '2g' || effectiveType === '3g');
      }
    };

    checkConnectionSpeed();
    window.addEventListener('online', checkConnectionSpeed);
    window.addEventListener('offline', checkConnectionSpeed);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', checkConnectionSpeed);
      window.removeEventListener('offline', checkConnectionSpeed);
    };
  }, []);

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
