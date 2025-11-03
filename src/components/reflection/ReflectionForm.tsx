'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import { useValidation } from '@/hooks/useValidation';
import DynamicField from './DynamicField';
import { Button } from '@/components/ui/button';

interface ReflectionData {
  framework_id: string;
  content: Record<string, string>;
  created_at: string;
}

interface SaveMessage {
  text: string;
  type: 'success' | 'error';
}

interface ReflectionFormProps {
  onSave?: (data: ReflectionData) => Promise<void>;
}

export default function ReflectionForm({ onSave }: ReflectionFormProps) {
  const { selectedFrameworkId, selectedFramework, setSelectedFramework, frameworks } =
    useFrameworkStore();

  const { validateFormData, sanitizeFormData, errors, clearErrors } = useValidation();

  // メモリキャッシュ（フレームワーク切り替え時の一時保存）
  const cacheRef = useRef<Record<string, Record<string, string>>>({});

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null);
  const previousFrameworkIdRef = useRef<string | null>(null);

  // フレームワーク切り替え時の処理
  useEffect(() => {
    if (!selectedFrameworkId) return;

    const previousId = previousFrameworkIdRef.current;

    // 最初のフレームワーク選択時
    if (!previousId) {
      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      clearErrors();
      previousFrameworkIdRef.current = selectedFrameworkId;
      return;
    }

    // フレームワークが変更された場合
    if (previousId !== selectedFrameworkId) {
      // 前のフレームワークのデータを一時保存
      if (Object.keys(formData).length > 0) {
        cacheRef.current[previousId] = formData;
      }

      // 新しいフレームワークのデータを復元
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

  // 保存（バリデーション付き）
  const handleSave = async () => {
    if (!selectedFrameworkId || !selectedFramework) return;

    try {
      const isValid = validateFormData(formData, selectedFramework.schema || []);

      if (!isValid) {
        const formErrorMessage = Object.values(errors).join('\n');
        setSaveMessage({
          text: formErrorMessage || '入力を確認してください',
          type: 'error',
        });
        return;
      }

      setIsSaving(true);
      setSaveMessage(null);

      const sanitized = sanitizeFormData(formData);

      const reflectionData: ReflectionData = {
        framework_id: selectedFrameworkId,
        content: sanitized,
        created_at: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(reflectionData);
      }

      // キャッシュも更新
      cacheRef.current[selectedFrameworkId] = sanitized;

      clearErrors();
      setSaveMessage({
        text: '保存しました',
        type: 'success',
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      setSaveMessage({
        text: message,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // リセット
  const handleReset = () => {
    setFormData({});
    clearErrors();
    setSaveMessage(null);
  };

  if (!selectedFramework) {
    return <div className="text-center p-4">フレームワークを選択してください</div>;
  }

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
          disabled={isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? '保存中...' : '💾 保存'}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={Object.keys(formData).length === 0}
        >
          🔄 リセット
        </Button>
      </div>

      {/* 保存メッセージ（タイプで分離）*/}
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
              <p className="font-medium">確実に保存するには「💾 保存」ボタンを押してください</p>
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