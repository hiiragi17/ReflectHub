import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithGoogle,
    signInAsGuest,
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
    signInAsGuest,
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
    isGuest: user?.provider === 'guest',
    canUseFeature: (feature: 'sync' | 'line' | 'ai') => {
      if (!isAuthenticated) return false;
      
      switch (feature) {
        case 'sync':
        case 'line':
        case 'ai':
          // これらの機能はログインユーザーのみ
          return user?.provider !== 'guest';
        default:
          return true;
      }
    },
  };
}
