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
  useEffect(() => {
    const fetchFrameworks = async () => {
      // 既に取得済みなら実行しない
      if (frameworks.length > 0) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await frameworkService.getFrameworks();
        setFrameworks(data);

        // 最初のフレームワークを選択
        if (data.length > 0 && !selectedFrameworkId) {
          setSelectedFramework(data[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'フレームワーク取得エラー';
        setError(message);
        console.error('フレームワーク取得失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFrameworks();
  }, [frameworks.length, selectedFrameworkId, setFrameworks, setSelectedFramework, setLoading, setError]);

  const selectFramework = useCallback((frameworkId: string) => {
    setSelectedFramework(frameworkId);
  }, [setSelectedFramework]);

  return {
    frameworks,
    selectedFrameworkId,
    selectedFramework,
    isLoading,
    error,
    selectFramework,
  };
};