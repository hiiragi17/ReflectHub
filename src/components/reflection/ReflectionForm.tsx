'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFrameworkStore } from '@/stores/frameworkStore';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReflectionFormProps {
  onSave?: (data: any) => Promise<void>;
}

export default function ReflectionForm({ onSave }: ReflectionFormProps) {
  const { selectedFrameworkId, selectedFramework, setSelectedFramework } = useFrameworkStore();
  const cacheRef = useRef<Record<string, Record<string, string>>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingFrameworkId, setPendingFrameworkId] = useState<string | null>(null);
  const previousFrameworkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedFrameworkId) return;

    const previousId = previousFrameworkIdRef.current;

    if (!previousId) {
      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      setHasUnsavedChanges(false);
      previousFrameworkIdRef.current = selectedFrameworkId;
      return;
    }

    if (previousId !== selectedFrameworkId) {
      if (hasUnsavedChanges && Object.keys(formData).length > 0) {
        setSelectedFramework(previousId);
        setPendingFrameworkId(selectedFrameworkId);
        setShowDialog(true);
        return;
      }

      if (Object.keys(formData).length > 0) {
        cacheRef.current[previousId] = formData;
      }

      const cached = cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      setHasUnsavedChanges(false);
      previousFrameworkIdRef.current = selectedFrameworkId;
    }
  }, [selectedFrameworkId]);

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleConfirmSwitch = () => {
    if (pendingFrameworkId && previousFrameworkIdRef.current) {
      delete cacheRef.current[previousFrameworkIdRef.current];
      
      previousFrameworkIdRef.current = pendingFrameworkId;
      setSelectedFramework(pendingFrameworkId);
      
      const cached = cacheRef.current[pendingFrameworkId];
      setFormData(cached || {});
      setHasUnsavedChanges(false);
      setShowDialog(false);
      setPendingFrameworkId(null);
    }
  };

  const handleCancelSwitch = () => {
    setShowDialog(false);
    setPendingFrameworkId(null);
  };

  const handleSave = async () => {
    if (!selectedFrameworkId) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      if (onSave) {
        await onSave({
          framework_id: selectedFrameworkId,
          content: formData,
          created_at: new Date().toISOString(),
        });
      }

      cacheRef.current[selectedFrameworkId] = formData;
      setHasUnsavedChanges(false);
      setSaveMessage('✅ 保存しました');

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      setSaveMessage(`❌ ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({});
    setHasUnsavedChanges(false);
    setSaveMessage(null);
  };

  if (!selectedFramework) {
    return <div className="text-center p-4">フレームワークを選択してください</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 入力フォーム */}
      <div className="space-y-4">
        {selectedFramework.schema?.map((field) => (
          <div key={field.id}>
            <Label htmlFor={field.id} className="text-base font-medium">
              {field.label}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className="resize-none mt-2"
            />
          </div>
        ))}
      </div>

      {/* 未保存警告バッジ */}
      {hasUnsavedChanges && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          ⚠️ 保存していない変更があります
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
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

      {/* 保存メッセージ */}
      {saveMessage && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded text-sm">
          {saveMessage}
        </div>
      )}

      {/* 未保存データ警告ダイアログ */}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
        fromFrameworkName={selectedFramework?.name}
        toFrameworkName="別のフレームワーク"
      />
    </div>
  );
}