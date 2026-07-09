'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Loader2,
  User,
  ChevronRight,
  Mail,
  Menu,
  X,
  PlusCircle,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { isValidUrl } from '@/utils/urlValidation';

const BRAND = 'ReflectHub';
const HOME_HREF = '/dashboard';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface LoggedInHeaderProps {
  userName: string;
  onSignOut: () => Promise<void>;
  title?: string;
  /** 現在ページより上の階層（ブランドと現在ページは自動付与）。 */
  breadcrumbs?: Breadcrumb[];
  contactUrl?: string;
}

/** グローバルナビの主要ページ（ダッシュボードのクイックアクションと対応）。 */
const NAV_ITEMS = [
  { href: '/reflection', label: '新しい振り返り', icon: PlusCircle },
  { href: '/history', label: '履歴を見る', icon: Calendar },
  { href: '/analytics', label: '統計を見る', icon: BarChart3 },
  { href: '/profile', label: '設定', icon: Settings },
] as const;

export default function LoggedInHeader({
  userName,
  onSignOut,
  title = BRAND,
  breadcrumbs = [],
  contactUrl,
}: LoggedInHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const isHome = title === BRAND && breadcrumbs.length === 0;
  const hasContact = contactUrl != null && isValidUrl(contactUrl);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await onSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  // メニュー: Escape で閉じてトリガーにフォーカスを戻す + 外側クリックで閉じる
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuPanelRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* 左側：ロゴ + パンくず */}
          {isHome ? (
            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
              <Link href={HOME_HREF} className="hover:text-blue-700 transition-colors">
                {BRAND}
              </Link>
            </h1>
          ) : (
            <nav aria-label="パンくずリスト" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1 sm:gap-1.5 min-w-0 text-sm">
                <li className="flex-shrink-0">
                  <Link
                    href={HOME_HREF}
                    className="font-semibold text-gray-900 hover:text-blue-700 transition-colors"
                  >
                    {BRAND}
                  </Link>
                </li>
                {breadcrumbs.map((crumb) => (
                  <li
                    key={crumb.href ?? crumb.label}
                    className="flex items-center gap-1 sm:gap-1.5 min-w-0"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-gray-600 hover:text-blue-700 transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-600 truncate">{crumb.label}</span>
                    )}
                  </li>
                ))}
                <li className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                  <h1 aria-current="page" className="font-semibold text-gray-900 truncate">
                    {title}
                  </h1>
                </li>
              </ol>
            </nav>
          )}

          {/* 右側（デスクトップ）：ユーザー名 + お問い合わせ + ログアウト */}
          <nav
            aria-label="ユーザーメニュー"
            className="hidden sm:flex items-center gap-4 flex-shrink-0"
          >
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">{userName}</span>
            </div>
            {hasContact && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="お問い合わせ (新しいタブで開く)"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-700 transition px-3 py-1.5 rounded-md hover:bg-gray-50"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">お問い合わせ</span>
              </a>
            )}
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              disabled={isLoading}
              aria-busy={isLoading}
              aria-label={isLoading ? 'ログアウト中' : 'ログアウト'}
              className="text-gray-700 hover:text-gray-900 px-3"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <LogOut className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="ml-2">{isLoading ? 'ログアウト中...' : 'ログアウト'}</span>
            </Button>
          </nav>

          {/* 右側（モバイル）：ハンバーガーメニュー */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu-panel"
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            className="sm:hidden flex items-center justify-center w-10 h-10 -mr-1 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* モバイルメニューパネル */}
      {isMenuOpen && (
        <div
          ref={menuPanelRef}
          id="mobile-menu-panel"
          className="sm:hidden border-t border-gray-200 bg-white shadow-sm"
        >
          <div className="max-w-6xl mx-auto px-3 py-3">
            <div className="flex items-center gap-2 text-gray-700 px-2 pb-3 mb-2 border-b border-gray-100">
              <User className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">{userName}</span>
            </div>

            <nav aria-label="メインメニュー">
              <ul className="flex flex-col">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-2 py-3 rounded-md text-gray-800 hover:bg-gray-50"
                    >
                      <Icon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                      <span className="text-sm">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col">
              {hasContact && (
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="お問い合わせ (新しいタブで開く)"
                  className="flex items-center gap-3 px-2 py-3 rounded-md text-gray-800 hover:bg-gray-50"
                >
                  <Mail className="w-5 h-5 text-gray-500" aria-hidden="true" />
                  <span className="text-sm">お問い合わせ</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  void handleSignOut();
                }}
                disabled={isLoading}
                aria-busy={isLoading}
                className="flex items-center gap-3 px-2 py-3 rounded-md text-gray-800 hover:bg-gray-50 disabled:opacity-50 text-left"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <LogOut className="w-5 h-5 text-gray-500" aria-hidden="true" />
                )}
                <span className="text-sm">{isLoading ? 'ログアウト中...' : 'ログアウト'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
