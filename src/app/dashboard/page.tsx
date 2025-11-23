'use client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { PlusCircle, Calendar, BarChart3, Settings } from 'lucide-react';
import DashboardLoading from './loading';
import Header from '@/components/layout/Header';

export default function DashboardPage() {
  const { user, signOut, isLoading, error } = useAuth();
  const router = useRouter();

  // デバッグログ
  useEffect(() => {
    console.log('[Dashboard] State:', {
      isLoading,
      hasUser: !!user,
      error,
      userName: user?.name
    });
  }, [isLoading, user, error]);

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[Dashboard] Redirecting to /auth - no user');
      const currentPath = window.location.pathname;
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  // エラー表示
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              エラーが発生しました
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                console.log('[Dashboard] Reloading page...');
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('[Dashboard] Showing loading state');
    return <DashboardLoading />;
  }

  if (!user) {
    console.log('[Dashboard] No user, showing loading state');
    return <DashboardLoading />;
  }

  console.log('[Dashboard] Rendering main content for user:', user.name);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header 
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="ReflectHub"
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            振り返りを始めましょう
          </h2>
          <p className="text-gray-600">
            3分で今週の振り返りを記録し、継続的な成長を実現しましょう。
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 新しい振り返り */}
          <Link href="/reflection">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-6 text-center">
                <PlusCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">新しい振り返り</h3>
                <p className="text-sm text-gray-600">今週の振り返りを作成</p>
              </CardContent>
            </Card>
          </Link>

          {/* 履歴を見る */}
          <Link href="/history">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-6 text-center">
                <Calendar className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">履歴を見る</h3>
                <p className="text-sm text-gray-600">過去の振り返りを確認</p>
              </CardContent>
            </Card>
          </Link>

          {/* 統計を見る */}
          <Card className="h-full relative opacity-60">
            <CardContent className="p-6 text-center">
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  Coming soon
                </span>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">統計を見る</h3>
              <p className="text-sm text-gray-600">成長の記録を確認</p>
            </CardContent>
          </Card>

          {/* 設定 */}
          <Link href="/profile">
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="p-6 text-center">
                <Settings className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">設定</h3>
                <p className="text-sm text-gray-600">プロフィール設定</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>はじめに</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">振り返りフレームワークを選択</h4>
                  <p className="text-sm text-gray-600">
                    YWT（やったこと・わかったこと・次にやること）またはKPT（Keep・Problem・Try）から選択できます
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">3分で振り返りを記録</h4>
                  <p className="text-sm text-gray-600">
                    各項目に思ったことを気軽に記入してください。完璧である必要はありません
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">継続して成長を実感</h4>
                  <p className="text-sm text-gray-600">
                    週1回の振り返りを続けることで、確実な成長を実感できます
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}