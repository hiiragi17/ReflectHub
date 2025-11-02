"use client";

import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from "@supabase/ssr";
import { Plus, Calendar, BarChart3, Settings } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証済みの場合は何も表示しない
  // （useEffect でリダイレクト中）
  if (user) {
    return null;
  }

  // 未認証ユーザーに対してランディングページを表示
  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            ReflectHub
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ログイン
            </Link>
              <Link
                href="/auth?mode=signup"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                サインアップ
              </Link>
            </div>
          </div>
        </header>
        {/* ヒーロー セクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            振り返りで成長を加速しよう
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            3分で今週の振り返りを記録し、継続的な成長を実現しましょう。
          </p>
          <p className="text-sm text-gray-500 mb-8 max-w-2xl mx-auto">
            YWT（やったこと・わかったこと・次にやること）またはKPT（Keep・Problem・Try）から選べます
          </p>
          <a
            href="/auth?mode=signup"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold transition"
          >
            今すぐ始める
          </a>
        </section>

        {/* 機能紹介 セクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <h3 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            主な機能
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 機能1 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                新しい振り返り
              </h4>
              <p className="text-sm text-gray-600">今週の振り返りを作成</p>
            </div>

            {/* 機能2 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                履歴を見る
              </h4>
              <p className="text-sm text-gray-600">過去の振り返りを確認</p>
            </div>

            {/* 機能3 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                統計を見る
              </h4>
              <p className="text-sm text-gray-600">成長の記録を確認</p>
            </div>

            {/* 機能4 */}
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">設定</h4>
              <p className="text-sm text-gray-600">リマインダーなど</p>
            </div>
          </div>
        </section>

        {/* はじめに セクション */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 mb-12">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">
            はじめに
          </h3>
          <div className="max-w-2xl mx-auto border border-gray-200 rounded-lg p-8 bg-gray-50">
            <div className="space-y-6">
              {/* ステップ1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold flex-shrink-0">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    振り返りフレームワークを選択
                  </h4>
                  <p className="text-gray-600">
                    YWT（やったこと・わかったこと・次にやること）またはKPT（Keep・Problem・Try）から選べます
                  </p>
                </div>
              </div>

              {/* ステップ2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold flex-shrink-0">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    3分で振り返りを記録
                  </h4>
                  <p className="text-gray-600">
                    各項目に思ったことを気軽に記入してください。完璧である必要はありません
                  </p>
                </div>
              </div>

              {/* ステップ3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold flex-shrink-0">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    継続して成長を実感
                  </h4>
                  <p className="text-gray-600">
                    週回の振り返りを続けることで、確実な成長を実感できます
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 最後の CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center border-t border-gray-200">
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            今日から始める
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            完璧である必要はありません。思ったことを気軽に記入してください。毎日の小さな振り返りが、大きな成長につながります。
          </p>
          <a
            href="/auth?mode=signup"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold transition"
          >
            無料で始める
          </a>
        </section>
    </div>
  );
}