'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { retryWithNetworkRecovery } from '@/utils/errorHandler';

export interface NetworkRecoveryState {
  isOnline: boolean;
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

export interface UseNetworkRecoveryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  onRecovered?: () => void;
  onFailed?: (error: Error) => void;
}

/**
 * Hook for automatic network recovery and offline detection.
 * Provides online/offline state and a wrapper for retrying failed operations.
 */
export function useNetworkRecovery(options: UseNetworkRecoveryOptions = {}) {
  const { maxRetries = 3, initialDelayMs = 1000, onRecovered, onFailed } = options;

  const [state, setState] = useState<NetworkRecoveryState>({
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const pendingOps = useRef<Array<() => Promise<unknown>>>([]);
  const isOnlineRef = useRef(state.isOnline);

  useEffect(() => {
    isOnlineRef.current = state.isOnline;
  }, [state.isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));

      // Flush pending operations individually so one failure doesn't block others
      const ops = pendingOps.current.splice(0);
      ops.forEach((op) => {
        op().catch(() => {
          // Individual operation failures are handled by executeWithRecovery
        });
      });

      onRecovered?.();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onRecovered]);

  const executeWithRecovery = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      setState((prev) => ({ ...prev, isRetrying: true, lastError: null, retryCount: 0 }));

      try {
        const result = await retryWithNetworkRecovery(operation, maxRetries, initialDelayMs);
        setState((prev) => ({ ...prev, isRetrying: false, retryCount: 0 }));
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isRetrying: false,
          lastError: err,
          retryCount: prev.retryCount + 1,
        }));
        onFailed?.(err);
        return null;
      }
    },
    [maxRetries, initialDelayMs, onFailed]
  );

  const queueWhenOnline = useCallback(
    <T,>(operation: () => Promise<T>): Promise<T | null> => {
      if (isOnlineRef.current) {
        return executeWithRecovery(operation);
      }

      return new Promise<T | null>((resolve) => {
        pendingOps.current.push(async () => {
          const result = await executeWithRecovery(operation);
          resolve(result);
        });
      });
    },
    [executeWithRecovery]
  );

  return {
    ...state,
    executeWithRecovery,
    queueWhenOnline,
  };
}
