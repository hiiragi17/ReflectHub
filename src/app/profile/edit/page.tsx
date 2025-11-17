'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import DashboardLoading from '@/app/dashboard/loading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/useToast';

export default function ProfileEditPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError('ユーザー情報が見つかりません');
      return;
    }

    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (name.trim().length > 100) {
      setError('名前は100文字以内で入力してください');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プロフィール更新に失敗しました');
      }

      showToast('プロフィールを更新しました', 'success');
      router.push('/profile');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プロフィール更新に失敗しました';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
        title="プロフィール編集"
        showBackButton={true}
        backHref="/profile"
      />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">プロフィール情報を編集</h1>
              <p className="text-gray-600 text-sm mb-6">
                現在のところ、名前のみ編集できます
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="あなたの名前を入力してください"
                maxLength={100}
                disabled={isSaving}
                className="text-base"
              />
              <p className="text-xs text-gray-500">{name.length}/100文字</p>
            </div>

            {/* Email field (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス（変更不可）</Label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                {user.email}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <Button
                type="submit"
                variant="default"
                disabled={isSaving || name === user.name}
                className="flex-1"
              >
                {isSaving ? '保存中...' : '変更を保存'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/profile')}
                disabled={isSaving}
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </form>

          {/* Sign out section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">その他の操作</h2>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowSignOutDialog(true)}
              disabled={isSigningOut}
              className="w-full"
            >
              {isSigningOut ? 'サインアウト中...' : 'サインアウト'}
            </Button>
          </div>
        </Card>
      </main>

      {/* Sign out confirmation dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>サインアウト</AlertDialogTitle>
          <AlertDialogDescription>
            本当にサインアウトしますか？
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700"
            >
              サインアウト
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
