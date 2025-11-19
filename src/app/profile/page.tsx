'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { ProfileCard } from '@/components/profile/ProfileCard';
import DashboardLoading from '@/app/dashboard/loading';

export default function ProfilePage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  if (isLoading) return <DashboardLoading />;
  if (!user) return <DashboardLoading />;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="プロフィール"
        showBackButton={true}
        backHref="/dashboard"
      />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProfileCard user={user} onSignOut={handleSignOut} isSigningOut={isSigningOut} />
      </main>
    </div>
  );
}
