'use client';

import { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User as UserIcon, Mail, Calendar, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface ProfileCardProps {
  user: User;
  onSignOut?: () => Promise<void>;
  isSigningOut?: boolean;
}

export function ProfileCard({ user, onSignOut, isSigningOut = false }: ProfileCardProps) {
  const providerLabel = user.provider === 'google' ? 'Google' : 'LINE';
  const providerColor = user.provider === 'google' ? 'bg-blue-50' : 'bg-green-50';

  return (
    <Card className="w-full max-w-2xl mx-auto p-8 shadow-sm">
      {/* Header with avatar and basic info */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        {/* Avatar or placeholder */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name}
              width={96}
              height={96}
              className="rounded-full object-cover border-4 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <UserIcon className="w-12 h-12 text-white" />
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
          <p className="text-gray-600 mb-4 flex items-center justify-center sm:justify-start gap-2">
            <Mail className="w-4 h-4" />
            {user.email}
          </p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${providerColor} text-gray-700`}>
            {providerLabel}でログイン
          </span>
        </div>
      </div>

      {/* Profile details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">メールアドレス</p>
          <p className="mt-2 text-lg text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">プロバイダ</p>
          <p className="mt-2 text-lg text-gray-900">{providerLabel}</p>
        </div>
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
