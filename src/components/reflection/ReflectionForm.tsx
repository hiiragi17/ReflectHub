'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import { useValidation } from '@/hooks/useValidation';
import { useReflectionMutation } from '@/hooks/useReflectionMutation';
import DynamicField from './DynamicField';
import { Button } from '@/components/ui/button';

/**
 * メッセージの型
 */
interface SaveMessage {
  text: string;
  type: 'success' | 'error';
}

/**
 * 振り返り入力フォーム（保存成功時にクリア版）
 *
 * 機能：
 * - フレームワーク切り替え時に一時保存（キャッシュ）
 * - 保存時にバリデーション実施
 * - Supabase に保存
 * - 楽観的更新
 * - ✅ 保存成功時にフォームをクリア
 * - ❌ 保存失敗時は内容をそのまま
 */
export default function ReflectionForm() {
  const { selectedFrameworkId, selectedFramework } = useFrameworkStore();

  const { validateFormData, sanitizeFormData, errors, clearErrors } = useValidation();
  const { saveReflection, isLoading, error: mutationError, clearError } =
    useReflectionMutation();

  // メモリキャッシュ（フレームワーク切り替え時の一時保存）
  const cacheRef = useRef<Record<string, Record<string, string>>>({});

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null);
  const previousFrameworkIdRef = useRef<string | null>(null);

  // フレームワーク切り替え時の処理
  useEffect(() => {
    if (!selectedFrameworkId) return;

    const previousId = previousFrameworkIdRef.current;

    if (!previousId) {
      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      clearErrors();
      previousFrameworkIdRef.current = selectedFrameworkId;
      return;
    }

    if (previousId !== selectedFrameworkId) {
      if (Object.keys(formData).length > 0) {
        cacheRef.current[previousId] = formData;
      }

      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      clearErrors();
      previousFrameworkIdRef.current = selectedFrameworkId;
    }
  }, [selectedFrameworkId, clearErrors]);

  // 入力変更
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  // 保存（Supabase に保存）
  const handleSave = async () => {
    if (!selectedFrameworkId || !selectedFramework) return;

    try {
      // 1️⃣ バリデーション実施
      const isValid = validateFormData(formData, selectedFramework.schema || []);

      if (!isValid) {
        const formErrorMessage = Object.values(errors).join('\n');
        setSaveMessage({
          text: formErrorMessage || '入力を確認してください',
          type: 'error',
        });
        return;
      }

      setSaveMessage(null);

      // 2️⃣ サニタイズ
      const sanitized = sanitizeFormData(formData);

      // 3️⃣ 楽観的更新コールバック
      const onOptimisticUpdate = () => {
        setSaveMessage({
          text: '保存中...',
          type: 'success',
        });
      };

      // 4️⃣ Supabase に保存
      const result = await saveReflection(
        {
          framework_id: selectedFrameworkId,
          content: sanitized,
          reflection_date: new Date().toISOString().split('T')[0],
        },
        onOptimisticUpdate
      );

      if (result) {
        // ✅ 保存成功時の処理

        // キャッシュもクリア
        cacheRef.current[selectedFrameworkId] = {};

        // フォームをクリア
        setFormData({});

        clearErrors();
        setSaveMessage({
          text: '保存しました',
          type: 'success',
        });

        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      // ❌ 保存失敗時の処理
      // フォームの内容はそのまま残す（formData は変更しない）

      const message = error instanceof Error ? error.message : '保存に失敗しました';
      setSaveMessage({
        text: message,
        type: 'error',
      });
    }
  };

  // リセット
  const handleReset = () => {
    setFormData({});
    clearErrors();
    setSaveMessage(null);
    clearError();
  };

  if (!selectedFramework) {
    return <div className="text-center p-4">フレームワークを選択してください</div>;
  }

  // フォーム全体のエラーメッセージ
  const formLevelError = errors['__form__'];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 入力フォーム */}
      <div className="space-y-6">
        {selectedFramework.schema?.map((field, index) => (
          <div key={field.id}>
            <DynamicField
              field={field}
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
              fieldIndex={index}
            />

            {/* バリデーションエラー表示 */}
            {errors[field.id] && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                {errors[field.id]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* フォーム全体のエラー表示 */}
      {formLevelError && (
        <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded text-sm">
          <p className="text-amber-900 font-medium flex items-center gap-2">
            <span>⚠️</span>
            {formLevelError}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? '保存中...' : '💾 保存'}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={Object.keys(formData).length === 0}
        >
          🔄 リセット
        </Button>
      </div>

      {/* 保存メッセージ */}
      {saveMessage && (
        <div
          className={`mt-4 p-3 rounded text-sm flex items-center gap-2 ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{saveMessage.type === 'success' ? '✅' : '❌'}</span>
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Mutation エラー表示 */}
      {mutationError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm">
          <p className="text-red-900 font-medium mb-2">🔴 エラーが発生しました</p>
          <p className="text-red-700">{mutationError.message}</p>
          {mutationError.details && (
            <pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto">
              {JSON.stringify(mutationError.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* 情報メッセージ */}
      {Object.keys(formData).length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-medium text-blue-900 mb-3">💡 入力内容について</p>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex gap-2">
              <span>✅</span>
              <p>別のフレームワークを試しても、戻ってくると入力内容が残ります</p>
            </div>
            <div className="flex gap-2">
              <span>⚠️</span>
              <p>ページを更新するとリセットされます</p>
            </div>
            <div className="flex gap-2">
              <span>💾</span>
              <p className="font-medium">「💾 保存」ボタンで Supabase に保存されます</p>
            </div>
            <div className="flex gap-2">
              <span>🎯</span>
              <p className="font-medium text-blue-900">保存成功後は自動的にフォームがクリアされます</p>
            </div>
            <div className="flex gap-2">
              <span>📝</span>
              <p>※ どれか1つ以上のフィールドに入力が必要です</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}