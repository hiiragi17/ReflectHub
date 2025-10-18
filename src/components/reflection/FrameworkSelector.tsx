'use client';

import React from 'react';
import { useFrameworks } from '@/hooks/useFrameworks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

export default function FrameworkSelector() {
  const {
    frameworks,
    selectedFrameworkId,
    selectedFramework,
    isLoading,
    error,
    selectFramework,
  } = useFrameworks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">フレームワークを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (frameworks.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-600">利用可能なフレームワークがありません</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* フレームワーク選択プルダウン */}
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          振り返りフレームワークを選択
        </label>
        <Select value={selectedFrameworkId || ''} onValueChange={selectFramework}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="フレームワークを選択..." />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((framework) => (
              <SelectItem key={framework.id} value={framework.id}>
                <div className="flex items-center gap-2">
                  <span>{framework.icon || '📋'}</span>
                  <span>{framework.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 選択されたフレームワークの詳細 */}
      {selectedFramework && (
        <Card className="p-4 bg-blue-50 border-blue-200 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{selectedFramework.icon || '📋'}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                {selectedFramework.name}
              </h4>
              
              {selectedFramework.description && (
                <p className="text-sm text-gray-700 mb-3">
                  {selectedFramework.description}
                </p>
              )}
              
              {selectedFramework.schema && selectedFramework.schema.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">記入項目:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFramework.schema.map((field) => (
                      <span
                        key={field.id}
                        className="px-2 py-1 bg-white rounded text-xs text-gray-700 border border-blue-200"
                      >
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}