'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from '@/components/reflection/Calendar';
import Header from '@/components/layout/Header';
import DashboardLoading from '@/app/dashboard/loading';
import { reflectionService } from '@/services/reflectionService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import { X, ChevronRight } from 'lucide-react';

interface ReflectionDetail {
  date: Date;
  reflections: Reflection[];
}

export default function HistoryPage() {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ReflectionDetail | null>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = window.location.pathname;
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
    }
  }, [user, authLoading, router]);

  // Fetch reflections and frameworks
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch reflections
        const reflectionsData = await reflectionService.getByUser(user.id);
        setReflections(reflectionsData);

        // Fetch frameworks
        const { supabase } = await import('@/lib/supabase/client');
        const { data: frameworksData, error: frameworksError } = await supabase
          .from('frameworks')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (frameworksError) {
          throw new Error('フレームワークの取得に失敗しました');
        }

        // Parse schema field if it's a string
        const parsedFrameworks = (frameworksData || []).map((framework) => {
          const schema = typeof framework.schema === 'string'
            ? JSON.parse(framework.schema)
            : framework.schema;

          return {
            ...framework,
            schema: schema?.fields || [],
          };
        });

        setFrameworks(parsedFrameworks);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  // Handle date click
  const handleDateClick = (date: Date, dateReflections: Reflection[]) => {
    setSelectedDetail({
      date,
      reflections: dateReflections,
    });
  };

  // Close detail panel
  const closeDetail = () => {
    setSelectedDetail(null);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return '日付不明';
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
  };

  // Get framework by ID
  const getFramework = (frameworkId: string): Framework | undefined => {
    return frameworks.find((f) => f.id === frameworkId);
  };

  // Loading state
  if (authLoading || isLoading) {
    return <DashboardLoading />;
  }

  // Not authenticated
  if (!user) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        isAuthenticated={!!user}
        userName={user.name}
        onSignOut={handleSignOut}
        title="振り返り履歴"
        showBackButton={true}
        backHref="/dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        <section aria-label="振り返り統計" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-700 mb-1" id="stat-total">総振り返り数</p>
            <p className="text-3xl font-bold text-gray-900" aria-labelledby="stat-total">{reflections.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-700 mb-1" id="stat-month">今月の振り返り</p>
            <p className="text-3xl font-bold text-gray-900" aria-labelledby="stat-month">
              {reflections.filter((r) => {
                const date = new Date(r.reflection_date);
                const now = new Date();
                return (
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear()
                );
              }).length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-700 mb-1" id="stat-streak">継続日数</p>
            <p className="text-3xl font-bold text-gray-900" aria-labelledby="stat-streak">
              {new Set(reflections.map((r) => r.reflection_date)).size}
            </p>
          </div>
        </section>

        {/* Calendar and Detail View - Side by side */}
        {reflections.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-700 mb-4">まだ振り返りがありません</p>
            <button
              onClick={() => router.push('/reflection')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              最初の振り返りを作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar - Left side */}
            <div className="lg:col-span-1">
              <Calendar
                reflections={reflections}
                frameworks={frameworks}
                onDateClick={handleDateClick}
              />
            </div>

            {/* Reflection Detail Panel - Right side */}
            {selectedDetail && (
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                {/* Panel Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900">
                    {formatDate(selectedDetail.date)}
                  </h2>
                  <button
                    onClick={closeDetail}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="詳細パネルを閉じる"
                  >
                    <X className="w-5 h-5 text-gray-700" aria-hidden="true" />
                  </button>
                </div>

                {/* Panel Content */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                  {selectedDetail.reflections.map((reflection) => {
                    const framework = getFramework(reflection.framework_id);

                    return (
                      <div
                        key={reflection.id}
                        className="border border-gray-200 rounded-lg p-6"
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: framework?.color || '#6B7280',
                        }}
                      >
                        {/* Framework Header */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">{framework?.icon || '📝'}</span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {framework?.display_name || '振り返り'}
                          </h3>
                        </div>

                        {/* Reflection Content */}
                        <div className="space-y-4">
                          {(() => {
                            // Ensure schema is an array
                            const schema = Array.isArray(framework?.schema) ? framework.schema : [];

                            // If schema exists, display in array order (preserve original order)
                            if (schema.length > 0) {
                              return schema.map((field) => {
                                const value = reflection.content[field.id] || '';

                                return (
                                  <div key={field.id} className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                      {field.icon && <span className="mr-1">{field.icon}</span>}
                                      {field.label}
                                    </h4>
                                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                                      {value || '（未記入）'}
                                    </p>
                                  </div>
                                );
                              });
                            } else {
                              // Fallback: display all content fields
                              return Object.entries(reflection.content).map(([fieldId, value]) => (
                                <div key={fieldId} className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-700">
                                    {fieldId}
                                  </h4>
                                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                                    {value || '（未記入）'}
                                  </p>
                                </div>
                              ));
                            }
                          })()}
                        </div>

                        {/* Metadata */}
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-xs text-gray-700">
                            作成日: {reflection.created_at?.split('T')[0] || reflection.reflection_date}
                          </div>

                          {/* Detail View Button */}
                          <button
                            onClick={() => router.push(`/history/${reflection.id}`)}
                            className="flex items-center gap-1 text-blue-700 hover:text-blue-800 hover:underline transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
                            aria-label={`${framework?.display_name || '振り返り'}の詳細ページへ`}
                            title="詳細ページで編集可能です"
                          >
                            詳細表示
                            <ChevronRight className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
