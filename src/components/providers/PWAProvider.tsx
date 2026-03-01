'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register';
import InstallPrompt from '@/components/common/InstallPrompt';

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
