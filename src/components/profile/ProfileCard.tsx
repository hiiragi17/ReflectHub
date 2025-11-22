'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Mail, Calendar, Edit2, X, Check } from 'lucide-react';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
      <CardContent className="space-y-6">
        {/* アバター表示 */}
        {user.avatar_url && (
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
              <Image
                src={user.avatar_url}
                alt={user.name}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

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

        {/* メールアドレス */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            メールアドレス
          </Label>
          <p className="text-gray-900">{user.email}</p>
          <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
        </div>

        {/* プロバイダー */}
        <div className="space-y-2">
          <Label>ログイン方法</Label>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-gray-100 rounded-md text-sm font-medium capitalize">
              {user.provider}
            </div>
          </div>
        </div>

        {/* 登録日 */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            登録日
          </Label>
          <p className="text-gray-600">{formatDate(user.created_at)}</p>
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
