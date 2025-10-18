import { useEffect } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import { frameworkService } from '@/services/frameworkService';

export const useFrameworks = () => {
  const {
    frameworks,
    selectedFrameworkId,
    isLoading,
    error,
    setFrameworks,
    setSelectedFramework,
    setLoading,
    setError,
    getSelectedFramework,
  } = useFrameworkStore();

  // フレームワーク一覧を取得
  useEffect(() => {
    const loadFrameworks = async () => {
      setLoading(true);
      try {
        const data = await frameworkService.getFrameworks();
        setFrameworks(data);
        
        // 最初のフレームワークを自動選択
        if (data.length > 0 && !selectedFrameworkId) {
          setSelectedFramework(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    loadFrameworks();
  }, [setFrameworks, setLoading, setError, setSelectedFramework, selectedFrameworkId]);

  return {
    frameworks,
    selectedFrameworkId,
    selectedFramework: getSelectedFramework(),
    isLoading,
    error,
    selectFramework: setSelectedFramework,
  };
};
