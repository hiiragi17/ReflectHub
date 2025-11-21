'use client';
import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useAuthStore } from '@/stores/authStore';
import { Session } from '@supabase/supabase-js';

interface SessionContextType {
  checkSession: () => Promise<Session | null>;
  refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const sessionManager = useSessionManager();
  const initialized = useRef(false);

  // 初回マウント時に一度だけ認証状態を初期化
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const { initialize } = useAuthStore.getState();
      initialize();
    }
  }, []);

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

// app/layout.tsx での使用例
/*
import { SessionProvider } from '@/components/providers/SessionProvider';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
*/
