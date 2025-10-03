'use client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, LogOut, PlusCircle, Calendar, BarChart3, Settings } from 'lucide-react';
import DashboardLoading from './loading'; // 既存のloading.tsxをインポート

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  // useEffectでクライアントサイドのリダイレクトを処理
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  // ローディング中は既存のスケルトンを表示
  if (isLoading) {
    return <DashboardLoading />;
  }

  // ユーザーがいない場合もスケルトンを表示（リダイレクト中）
  if (!user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">ReflectHub</h1>
              <p className="text-sm text-gray-600">
                ようこそ、{user.name}さん
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

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
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <PlusCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">新しい振り返り</h3>
              <p className="text-sm text-gray-600">今週の振り返りを作成</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">履歴を見る</h3>
              <p className="text-sm text-gray-600">過去の振り返りを確認</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">統計を見る</h3>
              <p className="text-sm text-gray-600">成長の記録を確認</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">設定</h3>
              <p className="text-sm text-gray-600">リマインダーなど</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                今週の実施
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">0回</div>
              <p className="text-sm text-gray-600 mt-1">
                今週はまだ振り返りがありません
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                継続日数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">0日</div>
              <p className="text-sm text-gray-600 mt-1">
                振り返りを始めましょう
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                総振り返り数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">0回</div>
              <p className="text-sm text-gray-600 mt-1">
                記録を蓄積していきましょう
              </p>
            </CardContent>
          </Card>
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
            
            <div className="mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" />
                最初の振り返りを作成
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}