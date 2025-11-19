"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import {
  CreateReflectionRequest,
  ReflectionResponse,
  ReflectionError,
} from "@/types/reflection";
import { reflectionService } from "@/services/reflectionService";

interface SaveState {
  isLoading: boolean;
  isSuccess: boolean;
  error: ReflectionError | null;
}

export const useReflectionMutation = () => {
  const [userId, setUserId] = useState<string>("");

  const [state, setState] = useState<SaveState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Auth error:", error.message);
          return;
        }

        if (user?.id) {
          setUserId(user.id);
          console.log("User ID:", user.id);
        }
      } catch (error) {
        console.error("Failed to get user:", error);
      }
    };

    getUser();
  }, []);

  const saveReflection = useCallback(
    async (
      request: CreateReflectionRequest,
      onOptimisticUpdate?: (data: ReflectionResponse) => void,
      onOptimisticRollback?: (tempId: string) => void
    ): Promise<ReflectionResponse | null> => {
      if (!userId) {
        setState({
          isLoading: false,
          isSuccess: false,
          error: {
            code: "USER_ID_NOT_SET",
            message: "ユーザーID を取得中です。しばらくお待ちください。",
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
          user_id: userId,
          framework_id: request.framework_id,
          content: request.content,
          reflection_date:
            request.reflection_date || new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        };

        onOptimisticUpdate?.(optimisticData);

        const result = await reflectionService.create(userId, request);

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
    [userId]
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
    userId,

    saveReflection,
    retryWithBackoff,
    clearError,
    clearSuccess,
  };
};
