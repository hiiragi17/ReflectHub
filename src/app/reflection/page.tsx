"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import DashboardLoading from "../loading";
import FrameworkSelector from "@/components/reflection/FrameworkSelector";
import ReflectionForm from '@/components/reflection/ReflectionForm';

export default function ReflectionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm sm:text-base">ダッシュボード</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center flex-grow">
              新しい振り返りを作成
            </h1>
            <div className="hidden sm:block w-24" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* フレームワーク選択 */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">
                ステップ 1: フレームワークを選択
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <FrameworkSelector />
            </CardContent>
          </Card>

          {/* 振り返りフォーム */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">
                ステップ 2: 振り返りを記入
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <ReflectionForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}