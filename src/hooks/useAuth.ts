import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithGoogle,
    signOut,
    initialize,
    clearError,
  } = useAuthStore();

  // アプリ起動時の初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithGoogle,
    signOut,
    clearError,
  };
}

// 認証が必要なページで使用するカスタムフック
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return {
    user,
    isLoading,
    isAuthenticated,
    canUseFeature: () => {
      // 認証済みユーザーのみすべての機能を利用可能
      return isAuthenticated;
    },
  };
}