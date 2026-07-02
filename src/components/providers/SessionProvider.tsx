'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { Session } from '@supabase/supabase-js';

interface SessionContextType {
  checkSession: () => Promise<Session | null>;
  refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

// トークンの自動リフレッシュは supabase-js (createBrowserClient) の
// autoRefreshToken に一任する。独自のインターバルで refreshSession() を
// 併走させると、PWA 復帰時などに同一リフレッシュトークンの二重使用
// (ローテーション競合) が起き、セッションファミリーごと失効して
// 強制ログアウトになるため、ここでは何も上乗せしない。
export function SessionProvider({ children }: SessionProviderProps) {
  const sessionManager = useSessionManager();

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
