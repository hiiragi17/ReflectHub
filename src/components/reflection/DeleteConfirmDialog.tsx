'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  reflectionDate: string;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * DeleteConfirmDialog - Modal for confirming reflection deletion
 *
 * Features:
 * - Warning icon and message
 * - Display reflection date to be deleted
 * - Confirm and cancel buttons
 * - Loading state during deletion
 * - Error message display for permission issues
 * - Prevents accidental deletion
 */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  reflectionDate,
  isLoading = false,
  error = null,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const isDisabled = isDeleting || isLoading;

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="bg-white w-full max-w-sm rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                削除確認
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={isDisabled}
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Warning message */}
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                以下の振り返りを削除しようとしています：
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">
                  {reflectionDate}
                </p>
              </div>
            </div>

            {/* Warning text */}
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                この操作は取り消せません。この振り返りデータを本当に削除してもよろしいですか？
              </p>
            </div>

            {/* Error message if permission denied */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Footer with actions */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg space-y-3">
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isDisabled}
                className="w-full sm:w-auto"
              >
                キャンセル
              </Button>

              <button
                onClick={handleConfirm}
                disabled={isDisabled}
                className="flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto px-4 py-2 rounded-lg transition-colors"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? '削除中...' : '削除'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
