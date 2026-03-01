export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'google';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  provider?: string;
}

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface ProfileData {
  id: string;
  email: string;
  name: string;
  provider: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  createDefaultProfile: (sessionUser: SupabaseUser) => Promise<ProfileData | null>;
}