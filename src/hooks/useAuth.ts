import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    signInWithGoogle,
    signOut,
    clearError,
  } = useAuthStore();

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