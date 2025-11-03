'use client';

import { useCallback, useRef, useState } from 'react';

export const useFrameworkSwitch = () => {
  const contentCache = useRef<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingFrameworkId, setPendingFrameworkId] = useState<string | null>(null);

  const cacheContent = useCallback((frameworkId: string, content: any) => {
    contentCache.current[frameworkId] = content;
  }, []);

  const getContentFromCache = useCallback((frameworkId: string) => {
    return contentCache.current[frameworkId] || null;
  }, []);

  const confirmSwitch = useCallback(async () => {
    if (pendingFrameworkId) {
      setPendingFrameworkId(null);
      setHasUnsavedChanges(false);

      // Promise を解決
      if ((window as any).__frameworkSwitchResolver) {
        (window as any).__frameworkSwitchResolver.resolve(true);
        delete (window as any).__frameworkSwitchResolver;
      }

      return true;
    }
    return false;
  }, [pendingFrameworkId]);

  const cancelSwitch = useCallback(() => {
    setPendingFrameworkId(null);

    if ((window as any).__frameworkSwitchResolver) {
      (window as any).__frameworkSwitchResolver.resolve(false);
      delete (window as any).__frameworkSwitchResolver;
    }
  }, []);

  const switchWithWarning = useCallback(
    async (toFrameworkId: string): Promise<boolean> => {
      if (!hasUnsavedChanges) {
        // 未保存データがなければそのまま切り替え
        setHasUnsavedChanges(false);
        return true;
      }

      // 未保存データがある場合は確認
      setPendingFrameworkId(toFrameworkId);

      return new Promise((resolve) => {
        (window as any).__frameworkSwitchResolver = { resolve };
      });
    },
    [hasUnsavedChanges]
  );

  return {
    // State
    hasUnsavedChanges,
    pendingFrameworkId,

    // Actions
    cacheContent,
    getContentFromCache,
    switchWithWarning,
    confirmSwitch,
    cancelSwitch,
    setHasUnsavedChanges,
  };
};