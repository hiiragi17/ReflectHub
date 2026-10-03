'use client';

import { useEffect, useCallback } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import { frameworkService } from '@/services/frameworkService';

export const useFrameworks = () => {
  const {
    frameworks,
    selectedFrameworkId,
    selectedFramework,
    isLoading,
    error,
    setFrameworks,
    setSelectedFramework,
    setLoading,
    setError,
  } = useFrameworkStore();

  // 初期化：フレームワーク一覧を取得
  const fetchFrameworks = useCallback(async (force = false) => {
    // 既に取得済みなら実行しない（再読み込みのボタンからは force で取得し直す）
    if (!force && frameworks.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await frameworkService.getFrameworks();
      setFrameworks(data);

      // LocalStorageから最後に使用したフレームワークIDを取得
      if (data.length > 0 && !selectedFrameworkId) {
        let lastUsedId: string | null = null;
        try {
          lastUsedId = localStorage.getItem('lastUsedFrameworkId');
        } catch (storageError) {
          // プライベートモードやサンドボックス等でlocalStorageが使えない場合は無視
          console.warn('Failed to read lastUsedFrameworkId from localStorage:', storageError);
        }

        // LocalStorageに保存されているIDが有効な場合はそれを選択
        if (lastUsedId && data.find(f => f.id === lastUsedId)) {
          setSelectedFramework(lastUsedId);
        } else {
          // なければ最初のフレームワークを選択
          setSelectedFramework(data[0].id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'フレームワーク取得エラー';
      setError(message);
      console.error('フレームワーク取得失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [frameworks.length, selectedFrameworkId, setFrameworks, setSelectedFramework, setLoading, setError]);

  useEffect(() => {
    fetchFrameworks();
  }, [fetchFrameworks]);

  const selectFramework = useCallback((frameworkId: string) => {
    setSelectedFramework(frameworkId);
  }, [setSelectedFramework]);

  // onClick に直接渡されてもイベントが force に入らないよう、引数なしで包む
  const reload = useCallback(() => fetchFrameworks(true), [fetchFrameworks]);

  return {
    frameworks,
    selectedFrameworkId,
    selectedFramework,
    isLoading,
    error,
    selectFramework,
    reload,
  };
};