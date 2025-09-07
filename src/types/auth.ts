export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'google' | 'line' | 'guest';
  avatar_url?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  createDefaultProfile: (sessionUser: any) => Promise<any>;
}

export interface GuestData {
  id: string;
  name: string;
  email: string;
  created_at: string;
}