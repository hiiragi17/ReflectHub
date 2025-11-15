'use client';

import React, { useState, useCallback } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import DynamicField from './DynamicField';
import { useValidation } from '@/hooks/useValidation';
import { Button } from '@/components/ui/button';

interface ReflectionEditModalProps {
  reflection: Reflection;
  framework: Framework | undefined;
  isLoading?: boolean;
  onSave: (content: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

/**
 * ReflectionEditModal - Modal for editing reflection content
 *
 * Features:
 * - Edit mode with form fields
 * - Field validation
 * - Change detection
 * - Save and cancel actions
 * - Loading state during save
 */
export const ReflectionEditModal: React.FC<ReflectionEditModalProps> = ({
  reflection,
  framework,
  isLoading = false,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    reflection.content
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { validateFormData, sanitizeFormData, errors, clearErrors } =
    useValidation();

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Check if content has changed from original
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(reflection.content);
    setHasChanges(hasChanged || value !== reflection.content[fieldId]);
  }, [reflection.content]);

  const handleSave = async () => {
    if (!framework) return;

    try {
      setError(null);

      // Validate form data
      const isValid = validateFormData(formData, framework.schema || []);
      if (!isValid) {
        const errorMessages = Object.entries(errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join('\n');
        setError(errorMessages || '入力を確認してください');
        return;
      }

      // Sanitize and save
      setIsSaving(true);
      const sanitized = sanitizeFormData(formData);
      await onSave(sanitized);
      setHasChanges(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '保存に失敗しました';
      setError(errorMessage);
      console.error('Failed to save reflection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(reflection.content);
    setHasChanges(false);
    clearErrors();
    setError(null);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        '変更が保存されていません。本当に閉じますか？'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (!framework) {
    return null;
  }

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        <div
          className="bg-white w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 border-b border-gray-200 p-6 bg-white sm:rounded-t-lg flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              振り返りを編集
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={isSaving || isLoading}
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-6">
              {framework.schema && framework.schema.length > 0 ? (
                framework.schema.map((field, idx) => (
                  <DynamicField
                    key={field.id || `field-${idx}`}
                    field={field}
                    value={formData[field.id] || ''}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    fieldIndex={idx}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">フィールドがありません</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer with actions */}
          <div className="sticky bottom-0 border-t border-gray-200 p-6 bg-gray-50 sm:rounded-b-lg space-y-3">
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving || isLoading}
                className="w-full sm:w-auto"
              >
                キャンセル
              </Button>

              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                  disabled={isSaving || isLoading}
                  title="変更を破棄"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>リセット</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoading}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto px-4 py-2 rounded-lg transition-colors"
              >
                {isSaving && <span className="animate-spin">⏳</span>}
                <Save className="w-4 h-4" />
                <span>{isSaving ? '保存中...' : '保存'}</span>
              </button>
            </div>

            {hasChanges && (
              <p className="text-xs text-gray-500 text-center">
                変更されたフィールドを保存します
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
