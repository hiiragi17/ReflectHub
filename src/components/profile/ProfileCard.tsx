'use client';

import { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, LogOut } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface ProfileCardProps {
  user: User;
  onSignOut?: () => Promise<void>;
  isSigningOut?: boolean;
}

export function ProfileCard({ user, onSignOut, isSigningOut = false }: ProfileCardProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto p-8 shadow-sm">
      {/* Header with user name */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
      </div>

      {/* Profile details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">登録日時</p>
          <p className="mt-2 text-lg text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(user.created_at)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">最終更新</p>
          <p className="mt-2 text-lg text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(user.updated_at)}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/profile/edit" className="flex-1">
          <Button variant="default" className="w-full">
            プロフィールを編集
          </Button>
        </Link>
        {onSignOut && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isSigningOut ? 'サインアウト中...' : 'サインアウト'}
          </Button>
        )}
      </div>
    </Card>
  );
}
