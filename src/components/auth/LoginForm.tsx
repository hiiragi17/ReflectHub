'use client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getSafeRedirectPath } from '@/utils/safeRedirect';

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginForm() {
  const { 
    isLoading, 
    error, 
    isAuthenticated,
    signInWithGoogle, 
    clearError 
  } = useAuth();
  const router = useRouter();

  // 認証済みの場合は元のページまたはダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      // URLから next パラメータを取得して、元のページに戻る
      const searchParams = new URLSearchParams(window.location.search);
      router.push(getSafeRedirectPath(searchParams.get('next'), '/'));
    }
  }, [isAuthenticated, router]);

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-sm bg-white">
      <CardHeader className="text-center pb-6 pt-8">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            ReflectHub
          </h1>
        </div>
        <p className="text-sm text-gray-600 font-normal">
          3分で振り返り、毎週の成長を可視化
        </p>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        <div className="space-y-4">
          {/* Google ログイン */}
          <Button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full h-11 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-sm transition-colors"
            variant="outline"
          >
            <GoogleLogo className="w-4 h-4 mr-3" />
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>

          {/* エラー表示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-start">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={clearError}
                  aria-label="エラーを閉じる"
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* 機能説明 */}
          <div className="mt-8 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                簡単3分で振り返り完了
              </p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                カレンダーで成長を可視化
              </p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                データは安全に保存
              </p>
            </div>
          </div>

          {/* フッター */}
          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              ログインすることで
              <Link href="/terms" className="underline hover:text-gray-600">
                利用規約
              </Link>
              と
              <br />
              <Link href="/privacy" className="underline hover:text-gray-600">
                プライバシーポリシー
              </Link>
              に同意したものとします
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}