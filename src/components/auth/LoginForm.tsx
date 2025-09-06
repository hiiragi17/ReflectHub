'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { Chrome, User } from 'lucide-react';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setError('ログインに失敗しました。もう一度お試しください。');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // ゲストモードの設定
    localStorage.setItem('auth_mode', 'guest');
    localStorage.setItem('guest_id', `guest_${Date.now()}`);
    
    // ダッシュボードへリダイレクト
    window.location.href = '/dashboard';
  };

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
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-11 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-sm transition-colors"
            variant="outline"
          >
            <Chrome className="w-4 h-4 mr-3 text-gray-600" />
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </Button>

          {/* 区切り線 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-gray-500 font-normal">
                または
              </span>
            </div>
          </div>

          {/* ゲストログイン */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              まずは試してみたい方は、ゲストモードで
              <br />
              お使いいただけます
            </p>
            
            <Button
              onClick={handleGuestLogin}
              className="w-full h-11 bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-150 hover:border-gray-300 font-medium text-sm transition-colors"
              variant="outline"
            >
              <User className="w-4 h-4 mr-3" />
              ゲストとして始める
            </Button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
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