'use client';

import { useCallback } from 'react';
import { useToast } from './useToast';
import {
  createAppError,
  handleFetchError,
  AppError,
  errorLogger,
} from '@/utils/errorHandler';

/**
 * Hook for unified error handling in components
 */
export function useErrorHandler() {
  const toast = useToast();

  /**
   * Handle async operation with error handling and toast notification
   */
  const handleAsync = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        onError?: (error: AppError) => void;
        showSuccess?: boolean;
      }
    ): Promise<T | null> => {
      try {
        const result = await operation();

        if (options?.showSuccess && options?.successMessage) {
          toast.success(options.successMessage);
        }

        return result;
      } catch (error) {
        const appError = createAppError(error, undefined, options?.errorMessage);

        // Show error toast
        toast.error(options?.errorMessage || appError.message);

        // Call custom error handler if provided
        options?.onError?.(appError);

        return null;
      }
    },
    [toast]
  );

  /**
   * Handle fetch request with proper error handling
   */
  const handleFetch = useCallback(
    async <T,>(
      url: string,
      options?: RequestInit & {
        successMessage?: string;
        errorMessage?: string;
        showSuccess?: boolean;
      }
    ): Promise<T | null> => {
      try {
        const { successMessage, errorMessage, showSuccess, ...fetchOptions } =
          options || {};

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = await handleFetchError(response, errorMessage);
          toast.error(error.message);
          return null;
        }

        const data = await response.json();

        if (showSuccess && successMessage) {
          toast.success(successMessage);
        }

        return data as T;
      } catch (error) {
        const appError = createAppError(error);
        toast.error(options?.errorMessage || appError.message);
        return null;
      }
    },
    [toast]
  );

  /**
   * Log error for debugging
   */
  const logError = useCallback(
    (
      error: Error | unknown,
      context?: string,
      _metadata?: Record<string, unknown>
    ): void => {
      const appError = createAppError(error);
      errorLogger.log(appError);

      if (process.env.NODE_ENV === 'development') {
        console.error(`[${context || 'Error'}]`, appError);
      }
    },
    []
  );

  return {
    handleAsync,
    handleFetch,
    logError,
  };
}
