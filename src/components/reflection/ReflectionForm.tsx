'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import DynamicField from './DynamicField';
import { Button } from '@/components/ui/button';

interface ReflectionData {
  framework_id: string;
  content: Record<string, string>;
  created_at: string;
}

interface ReflectionFormProps {
  onSave?: (data: ReflectionData) => Promise<void>;
}

export default function ReflectionForm({ onSave }: ReflectionFormProps) {
  const { selectedFrameworkId, selectedFramework } =
    useFrameworkStore();

  // メモリキャッシュ（フレームワーク切り替え時の一時保存）
  const cacheRef = useRef<Record<string, Record<string, string>>>({});

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const previousFrameworkIdRef = useRef<string | null>(null);

  // フレームワーク切り替え時の処理
  useEffect(() => {
    if (!selectedFrameworkId) return;

    const previousId = previousFrameworkIdRef.current;

    // 最初のフレームワーク選択時
    if (!previousId) {
      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
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
      previousFrameworkIdRef.current = selectedFrameworkId;
    }
  }, [selectedFrameworkId]);

  // 入力変更
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  // DB に保存
  const handleSave = async () => {
    if (!selectedFrameworkId) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      const reflectionData: ReflectionData = {
        framework_id: selectedFrameworkId,
        content: formData,
        created_at: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(reflectionData);
      }

      // キャッシュも更新
      cacheRef.current[selectedFrameworkId] = formData;

      setSaveMessage('✅ 保存しました');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      setSaveMessage(`❌ ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // リセット
  const handleReset = () => {
    setFormData({});
    setSaveMessage(null);
  };

  if (!selectedFramework) {
    return <div className="text-center p-4">フレームワークを選択してください</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 入力フォーム */}
      <div className="space-y-6">
        {selectedFramework.schema?.map((field, index) => (
          <DynamicField
            key={field.id}
            field={field}
            value={formData[field.id] || ''}
            onChange={(value) => handleFieldChange(field.id, value)}
            fieldIndex={index}
          />
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {isSaving ? '保存中...' : '💾 保存'}
        </Button>
        <Button onClick={handleReset} variant="outline">
          🔄 リセット
        </Button>
      </div>

      {/* 保存メッセージ */}
      {saveMessage && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded text-sm">
          {saveMessage}
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
          </div>
        </div>
      )}
    </div>
  );
}