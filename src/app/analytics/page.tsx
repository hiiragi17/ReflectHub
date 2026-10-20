'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  Flame,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStatistics } from '@/hooks/useStatistics';
import Header from '@/components/layout/Header';
import DashboardLoading from '@/app/dashboard/loading';
import StatsCard from '@/components/statistics/StatsCard';
import TrendChart from '@/components/statistics/TrendChart';
import FrameworkBreakdown from '@/components/statistics/FrameworkBreakdown';
import PeriodComparison from '@/components/statistics/PeriodComparison';
import StreakDisplay from '@/components/statistics/StreakDisplay';
import ActivityHeatmap from '@/components/statistics/ActivityHeatmap';
import ThisWeekStatus from '@/components/statistics/ThisWeekStatus';
import GrowthTrendChart from '@/components/statistics/GrowthTrendChart';
import { SummaryPanel } from '@/components/analysis/SummaryPanel';

export default function AnalyticsPage() {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { summary, trends, distribution, isLoading, error, refetch } =
    useStatistics(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  if (authLoading || !user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="統計・トレンド分析"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              再読み込み
            </button>
          </div>
        )}

        {isLoading && !summary ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-white rounded-lg border border-gray-200 animate-pulse"
                />
              ))}
            </div>
            <div className="h-80 bg-white rounded-lg border border-gray-200 animate-pulse" />
          </div>
        ) : summary && trends && distribution ? (
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                KPI サマリー
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  label="総振り返り数"
                  value={summary.basicStats.total}
                  unit="件"
                  icon={BookOpen}
                  iconColor="text-blue-500"
                />
                <StatsCard
                  label="今月の振り返り"
                  value={summary.basicStats.thisMonth}
                  unit="件"
                  icon={CalendarDays}
                  iconColor="text-emerald-500"
                />
                <StatsCard
                  label="連続記録週数"
                  value={summary.weeklyStreak.currentStreak}
                  unit="週"
                  icon={Flame}
                  iconColor="text-orange-500"
                  description={`ベスト: ${summary.weeklyStreak.bestStreak} 週`}
                />
                <StatsCard
                  label="平均文字数"
                  value={summary.basicStats.averageCharacters}
                  unit="文字"
                  icon={Pencil}
                  iconColor="text-purple-500"
                  description="1件あたりの平均"
                />
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <TrendChart trends={trends} />
              </div>
              <ThisWeekStatus status={summary.thisWeekStatus} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PeriodComparison
                title="前月比"
                currentLabel="今月"
                previousLabel="先月"
                data={summary.monthComparison}
              />
              <PeriodComparison
                title="前週比"
                currentLabel="今週"
                previousLabel="先週"
                data={summary.weekComparison}
              />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <StreakDisplay streak={summary.weeklyStreak} />
              <div className="lg:col-span-2">
                <ActivityHeatmap heatmap={summary.weeklyHeatmap} />
              </div>
            </section>

            <section>
              <GrowthTrendChart trends={trends} />
            </section>

            <section>
              <FrameworkBreakdown distribution={distribution.frameworks} />
            </section>

            <section>
              <SummaryPanel />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
