'use client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChromeIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginForm() {
  const { 
    isLoading, 
    error, 
    isAuthenticated,
    signInWithGoogle, 
    clearError 
  } = useAuth();
  const router = useRouter();

  // 認証済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
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
            <ChromeIcon className="w-4 h-4 mr-3 text-gray-600" />
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>

          {/* エラー表示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-start">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={clearError}
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
              ログインすることで利用規約と
              <br />
              プライバシーポリシーに同意したものとします
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}