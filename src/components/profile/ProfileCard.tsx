'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Edit2, X, Check } from 'lucide-react';
import type { User } from '@/types/auth';

interface ProfileCardProps {
  user: User;
  onUpdateProfile: (name: string) => Promise<void>;
  isUpdating?: boolean;
}

export function ProfileCard({ user, onUpdateProfile, isUpdating = false }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    try {
      setError(null);
      await onUpdateProfile(name.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setError(null);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>プロフィール情報</CardTitle>
            <CardDescription>アカウント情報を確認・編集できます</CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              編集
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 名前 */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-500" />
            名前
          </Label>
          {isEditing ? (
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              disabled={isUpdating}
              className={error ? 'border-red-500' : ''}
            />
          ) : (
            <p className="text-gray-900 font-medium">{user.name}</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* 編集モードのアクションボタン */}
        {isEditing && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isUpdating || !name.trim()}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              {isUpdating ? '保存中...' : '保存'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
