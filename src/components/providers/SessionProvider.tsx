'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useSessionManager } from '@/hooks/useSessionManager';

interface SessionContextType {
  checkSession: () => Promise<any>;
  refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

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
