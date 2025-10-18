'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DashboardLoading from '../dashboard/loading';
import FrameworkSelector from '@/components/reflection/FrameworkSelector';
// import ReflectionForm from '@/components/reflection/ReflectionForm';

export default function ReflectionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>ダッシュボード</span>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">新しい振り返りを作成</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* フレームワーク選択 */}
          <Card>
            <CardHeader>
              <CardTitle>ステップ 1: フレームワークを選択</CardTitle>
            </CardHeader>
            <CardContent>
              <FrameworkSelector />
            </CardContent>
          </Card>

          {/* 振り返りフォーム */}
          <Card>
            <CardHeader>
              <CardTitle>ステップ 2: 振り返りを記入</CardTitle>
            </CardHeader>
            <CardContent>
              {/* <ReflectionForm /> */}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}