'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn, Mail } from 'lucide-react';
import { isValidUrl } from '@/utils/urlValidation';

interface LoggedOutHeaderProps {
  title?: string;
  contactUrl?: string;
}

export default function LoggedOutHeader({
  title = 'ReflectHub',
  contactUrl
}: LoggedOutHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-700">
              自分の成長を記録しましょう
            </p>
          </div>
          <nav aria-label="ナビゲーション" className="flex items-center gap-2 sm:gap-4">
            {contactUrl && isValidUrl(contactUrl) && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="お問い合わせ (新しいタブで開く)"
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-blue-700 transition px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-50"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline text-sm">お問い合わせ</span>
              </a>
            )}
            <Button
              asChild
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/auth" aria-label="ログインページへ移動">
                <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                ログイン
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}