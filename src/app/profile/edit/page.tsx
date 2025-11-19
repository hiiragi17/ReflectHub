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
import { useToast } from '@/hooks/useToast';

export default function ProfileEditPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        credentials: 'include',
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
        </Card>
      </main>
    </div>
  );
}
