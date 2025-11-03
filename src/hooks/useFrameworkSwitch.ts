'use client';

import { useRef, useState } from 'react';

interface CachedFormData {
  [fieldId: string]: string;
}

declare global {
  interface Window {
    __frameworkSwitchResolver?: {
      resolve: (value: boolean) => void;
    };
  }
}

export const useFrameworkSwitch = () => {
  // 入力内容のメモリキャッシュ（frameworkId -> content）
  const contentCache = useRef<Record<string, CachedFormData>>({});

  // 未保存フラグ
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 切り替え待機中のフレームワーク ID
  const [pendingFrameworkId, setPendingFrameworkId] = useState<string | null>(null);

  const cacheContent = (frameworkId: string, content: CachedFormData): void => {
    contentCache.current[frameworkId] = content;
  };

  const getContentFromCache = (frameworkId: string): CachedFormData | null => {
    return contentCache.current[frameworkId] || null;
  };

  const confirmSwitch = async (): Promise<boolean> => {
    if (pendingFrameworkId) {
      setPendingFrameworkId(null);
      setHasUnsavedChanges(false);

      if (window.__frameworkSwitchResolver) {
        window.__frameworkSwitchResolver.resolve(true);
        delete window.__frameworkSwitchResolver;
      }

      return true;
    }
    return false;
  };

  const cancelSwitch = (): void => {
    setPendingFrameworkId(null);

    if (window.__frameworkSwitchResolver) {
      window.__frameworkSwitchResolver.resolve(false);
      delete window.__frameworkSwitchResolver;
    }
  };

  const switchWithWarning = async (toFrameworkId: string): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true;
    }

    setPendingFrameworkId(toFrameworkId);

    return new Promise<boolean>((resolve) => {
      window.__frameworkSwitchResolver = { resolve };
    });
  };

  return {
    // 状態
    hasUnsavedChanges,
    pendingFrameworkId,

    // アクション
    cacheContent,
    getContentFromCache,
    switchWithWarning,
    confirmSwitch,
    cancelSwitch,
    setHasUnsavedChanges,
  };
};