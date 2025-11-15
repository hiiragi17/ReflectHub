'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { reflectionService } from '@/services/reflectionService';
import { frameworkService } from '@/services/frameworkService';
import { ReflectionDetail } from '@/components/reflection/ReflectionDetail';
import { ReflectionEditModal } from '@/components/reflection/ReflectionEditModal';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

/**
 * Reflection Detail Page
 *
 * Features:
 * - Displays single reflection with all details
 * - Shows framework information and fields
 * - Provides edit functionality via modal
 * - Back navigation to history
 */
export default function ReflectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, signOut, isLoading: authLoading } = useAuth();

  const reflectionId = params.id as string;

  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [framework, setFramework] = useState<Framework | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch reflection and framework data
  useEffect(() => {
    if (!user || !reflectionId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch reflection
        const reflectionData = await reflectionService.get(reflectionId);
        setReflection(reflectionData);

        // Fetch framework
        const frameworks = await frameworkService.getFrameworks();
        const fw = frameworks.find((f) => f.id === reflectionData.framework_id);
        setFramework(fw);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '振り返りデータの取得に失敗しました';
        setError(errorMessage);
        console.error('Failed to fetch reflection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, reflectionId]);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleBack = () => {
    router.back();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  const handleSaveEdit = async (updatedContent: Record<string, string>) => {
    if (!reflection) return;

    setIsUpdating(true);
    try {
      const updated = await reflectionService.update(reflection.id, {
        content: updatedContent,
      });

      // Update local state
      setReflection({
        ...reflection,
        content: updated.content,
        updated_at: new Date().toISOString(),
      });

      setShowEditModal(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '更新に失敗しました';
      setError(errorMessage);
      console.error('Failed to update reflection:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          isAuthenticated={!!user}
          userName={user?.name}
          onSignOut={handleSignOut}
          title="振り返り詳細"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isAuthenticated={!!user}
        userName={user?.name}
        onSignOut={handleSignOut}
        title="振り返り詳細"
      />

      <div className="max-w-3xl mx-auto py-8 px-4">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {reflection ? (
          <>
            <ReflectionDetail
              reflection={reflection}
              framework={framework}
              onEdit={handleEdit}
              onBack={handleBack}
              isLoading={isUpdating}
            />

            {/* Edit Modal */}
            {showEditModal && (
              <ReflectionEditModal
                reflection={reflection}
                framework={framework}
                isLoading={isUpdating}
                onSave={handleSaveEdit}
                onClose={handleCloseEditModal}
              />
            )}
          </>
        ) : (
          <div className="rounded-lg bg-white p-8 text-center">
            <p className="text-gray-500">振り返りが見つかりません</p>
          </div>
        )}
      </div>
    </div>
  );
}
