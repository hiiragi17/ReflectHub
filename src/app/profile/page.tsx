'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProfileCard } from '@/components/profile/ProfileCard';
import Header from '@/components/layout/Header';
import DashboardLoading from '../dashboard/loading';

export default function ProfilePage() {
  const { user, signOut, isLoading, error } = useAuth();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth?next=/profile');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  const handleUpdateProfile = async (name: string) => {
    if (!user) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch(`/api/auth/profile/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロフィールの更新に失敗しました');
      }

      // プロフィール更新成功時、ページをリロードして最新情報を取得
      window.location.reload();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '更新に失敗しました');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              エラーが発生しました
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="プロフィール"
        showBackButton
        backHref="/dashboard"
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {updateError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{updateError}</p>
          </div>
        )}

        <ProfileCard
          user={user}
          onUpdateProfile={handleUpdateProfile}
          isUpdating={isUpdating}
        />
      </main>
    </div>
  );
}
