"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLoading from "../dashboard/loading";
import FrameworkSelector from "@/components/reflection/FrameworkSelector";
import ReflectionForm from "@/components/reflection/ReflectionForm";
import Header from "@/components/layout/Header";

export default function ReflectionPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = window.location.pathname;
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!user) {
    return <DashboardLoading />;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth");
    } catch (error) {
      console.error("Sign out failed:", error);
      // Optionally show an error message to the user
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="新しい振り返りを作成"
        showBackButton={true}
        backHref="/dashboard"
      />

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
