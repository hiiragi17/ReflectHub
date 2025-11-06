'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CreateReflectionRequest,
  ReflectionResponse,
  ReflectionError,
} from '@/types/reflection';
import { reflectionService } from '@/services/reflectionService';

// Supabase クライアントを直接作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * 保存状態の型
 */
interface SaveState {
  isLoading: boolean;
  isSuccess: boolean;
  error: ReflectionError | null;
}

/**
 * 楽観的更新フック（シンプル版）
 *
 * ⚠️ 前提: このフックを使用するコンポーネントは ProtectedRoute でラップされている
 * つまり、ユーザーは必ずログイン済み
 *
 * 機能:
 * - マウント時に userId を取得（ログイン済み確定）
 * - 楽観的更新（即座に UI 更新）
 * - エラーハンドリング
 * - リトライ機能
 */
export const useReflectionMutation = () => {
  const [userId, setUserId] = useState<string>('');

  const [state, setState] = useState<SaveState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  // マウント時に userId を取得
  // ProtectedRoute でラップされているため、ここで getUser() は必ず成功する
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('⚠️ Auth error:', error.message);
          return;
        }

        if (user?.id) {
          setUserId(user.id);
          console.log('✅ User ID:', user.id);
        }
      } catch (error) {
        console.error('❌ Failed to get user:', error);
      }
    };

    getUser();
  }, []);

  /**
   * 振り返りを保存
   *
   * @param request 保存リクエスト
   * @param onOptimisticUpdate UI 即座更新用コールバック
   * @returns 保存されたデータ
   */
  const saveReflection = useCallback(
    async (
      request: CreateReflectionRequest,
      onOptimisticUpdate?: (data: ReflectionResponse) => void
    ): Promise<ReflectionResponse | null> => {
      // userId が未設定（取得中）なら待機
      if (!userId) {
        setState({
          isLoading: false,
          isSuccess: false,
          error: {
            code: 'USER_ID_NOT_SET',
            message: 'ユーザーID を取得中です。しばらくお待ちください。',
          },
        });
        return null;
      }

      try {
        setState({
          isLoading: true,
          isSuccess: false,
          error: null,
        });

        // 楽観的更新用のダミーデータ
        const optimisticData: ReflectionResponse = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          framework_id: request.framework_id,
          content: request.content,
          reflection_date: request.reflection_date || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };

        // 1️⃣ 即座に UI を更新（楽観的更新）
        onOptimisticUpdate?.(optimisticData);

        // 2️⃣ サーバーに保存
        const result = await reflectionService.create(userId, request);

        setState({
          isLoading: false,
          isSuccess: true,
          error: null,
        });

        return result;
      } catch (error) {
        const reflectionError = error as ReflectionError;

        setState({
          isLoading: false,
          isSuccess: false,
          error: reflectionError,
        });

        throw reflectionError;
      }
    },
    [userId]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * 成功ステータスをクリア
   */
  const clearSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSuccess: false,
    }));
  }, []);

  /**
   * リトライ（指数バックオフ）
   *
   * @param request リトライ対象のリクエスト
   * @param maxRetries 最大リトライ回数
   * @param onOptimisticUpdate 楽観的更新コールバック
   */
  const retryWithBackoff = useCallback(
    async (
      request: CreateReflectionRequest,
      maxRetries: number = 3,
      onOptimisticUpdate?: (data: ReflectionResponse) => void
    ): Promise<ReflectionResponse | null> => {
      let lastError: ReflectionError | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await saveReflection(request, onOptimisticUpdate);
        } catch (error) {
          lastError = error as ReflectionError;

          if (attempt < maxRetries - 1) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      throw lastError;
    },
    [saveReflection]
  );

  return {
    // 状態
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,
    userId,

    // アクション
    saveReflection,
    retryWithBackoff,
    clearError,
    clearSuccess,
  };
};