"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  CreateReflectionRequest,
  ReflectionResponse,
  ReflectionError,
} from "@/types/reflection";
import { reflectionService } from "@/services/reflectionService";
import { useAuthStore } from "@/stores/authStore";

interface SaveState {
  isLoading: boolean;
  isSuccess: boolean;
  error: ReflectionError | null;
}

export const useReflectionMutation = () => {
  // authStoreから最新のユーザー情報を取得（TOKEN_REFRESHEDで自動更新される）
  const { user } = useAuthStore();

  const [state, setState] = useState<SaveState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const saveReflection = useCallback(
    async (
      request: CreateReflectionRequest,
      onOptimisticUpdate?: (data: ReflectionResponse) => void,
      onOptimisticRollback?: (tempId: string) => void
    ): Promise<ReflectionResponse | null> => {
      if (!user?.id) {
        setState({
          isLoading: false,
          isSuccess: false,
          error: {
            code: "USER_NOT_AUTHENTICATED",
            message: "認証されていません。ログインしてください。",
          },
        });
        return null;
      }

      const tempId = uuidv4();

      try {
        setState({
          isLoading: true,
          isSuccess: false,
          error: null,
        });

        const optimisticData: ReflectionResponse = {
          id: tempId,
          user_id: user.id,
          framework_id: request.framework_id,
          content: request.content,
          reflection_date:
            request.reflection_date || new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        };

        onOptimisticUpdate?.(optimisticData);

        const result = await reflectionService.create(user.id, request);

        setState({
          isLoading: false,
          isSuccess: true,
          error: null,
        });

        return result;
      } catch (error) {
        if (onOptimisticRollback) {
          onOptimisticRollback(tempId);
        }
        const reflectionError = error as ReflectionError;
        setState({
          isLoading: false,
          isSuccess: false,
          error: reflectionError,
        });
        throw reflectionError;
      }
    },
    [user]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSuccess: false,
    }));
  }, []);

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

      if (lastError) {
        throw lastError;
      } else {
        throw new Error("Operation failed without recorded error");
      }
    },
    [saveReflection]
  );

  return {
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,

    saveReflection,
    retryWithBackoff,
    clearError,
    clearSuccess,
  };
};
