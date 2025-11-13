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
import { X } from 'lucide-react';

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
      router.push('/auth');
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
        const parsedFrameworks = (frameworksData || []).map((framework) => ({
          ...framework,
          schema: typeof framework.schema === 'string'
            ? JSON.parse(framework.schema)
            : framework.schema,
        }));

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

  // Close modal
  const closeModal = () => {
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
        title="ReflectHub"
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">振り返り履歴</h1>
          <p className="text-gray-600">
            カレンダーから日付を選択して、過去の振り返りを確認できます
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">総振り返り数</p>
            <p className="text-3xl font-bold text-gray-900">{reflections.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">今月の振り返り</p>
            <p className="text-3xl font-bold text-gray-900">
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
            <p className="text-sm text-gray-600 mb-1">継続日数</p>
            <p className="text-3xl font-bold text-gray-900">
              {new Set(reflections.map((r) => r.reflection_date)).size}
            </p>
          </div>
        </div>

        {/* Calendar */}
        {reflections.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-4">まだ振り返りがありません</p>
            <button
              onClick={() => router.push('/reflection')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              最初の振り返りを作成
            </button>
          </div>
        ) : (
          <Calendar
            reflections={reflections}
            frameworks={frameworks}
            onDateClick={handleDateClick}
          />
        )}
      </main>

      {/* Reflection Detail Modal */}
      {selectedDetail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {formatDate(selectedDetail.date)}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="閉じる"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
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
                      {Object.entries(reflection.content).map(([fieldId, value]) => {
                        // Ensure schema is an array before calling find
                        const schema = Array.isArray(framework?.schema) ? framework.schema : [];
                        const field = schema.find((f) => f.id === fieldId);

                        return (
                          <div key={fieldId} className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-700">
                              {field?.label || fieldId}
                            </h4>
                            <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                              {value || '（未記入）'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                      作成日時: {new Date(reflection.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
