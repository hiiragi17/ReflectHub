'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import DashboardLoading from '@/app/dashboard/loading';

export default function SettingsPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="設定"
        showBackButton={true}
        backHref="/dashboard"
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">設定</h2>
          <p className="text-gray-600">
            プロフィールやその他の設定をここで管理できます
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">プロフィール設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* View Profile Link */}
                <Link
                  href="/profile"
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">プロフィール情報を表示</p>
                    <p className="text-sm text-gray-600">登録情報の確認</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Reminder Settings - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">リマインダー設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600">
                  リマインダー機能は準備中です
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Other Settings - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">その他の設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600">
                  今後、追加設定オプションがここに表示されます
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
