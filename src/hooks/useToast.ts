'use client';

import { useCallback, useContext } from 'react';
import { ToastContext } from '@/components/providers/ToastProvider';
import { ToastMessage, ToastType } from '@/components/common/Toast';

/**
 * Hook for showing toast notifications
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  const { toasts, addToast, removeToast } = context;

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration: number = 3000,
      action?: { label: string; onClick: () => void }
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = {
        id,
        message,
        type,
        duration,
        action,
      };

      addToast(toast);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [addToast, removeToast]
  );

  const success = useCallback(
    (message: string, duration: number = 3000) => {
      return showToast(message, 'success', duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration: number = 5000) => {
      return showToast(message, 'error', duration);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration: number = 4000) => {
      return showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration: number = 3000) => {
      return showToast(message, 'info', duration);
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
  };
}
