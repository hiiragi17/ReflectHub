'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface LoggedInHeaderProps {
  userName: string;
  onSignOut: () => Promise<void>;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export default function LoggedInHeader({ 
  userName, 
  onSignOut, 
  title = 'ReflectHub',
  showBackButton = false,
  backHref = '/dashboard'
}: LoggedInHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await onSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* タイトル行 */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* 左側：戻るボタン + タイトル */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {showBackButton && (
              <Link
                href={backHref}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-xs sm:text-sm">戻る</span>
              </Link>
            )}
            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
          </div>

          {/* 右側：ユーザー名 + ログアウト */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{userName}</span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-800 px-2 sm:px-3"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span className="hidden sm:inline ml-2">
                {isLoading ? 'ログアウト中...' : 'ログアウト'}
              </span>
            </Button>
          </div>
        </div>

        {/* モバイル用ユーザー表示 */}
        <div className="sm:hidden flex items-center gap-2 text-gray-600 text-xs mt-2">
          <User className="w-3 h-3" />
          <span>{userName}</span>
        </div>
      </div>
    </header>
  );
}