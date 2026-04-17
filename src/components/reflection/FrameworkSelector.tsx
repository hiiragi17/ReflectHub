'use client';

import React from 'react';
import { useFrameworks } from '@/hooks/useFrameworks';
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
    <div className="space-y-6">
      {/* フレームワーク選択グリッド */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          振り返りフレームワークを選択
        </h3>

        {/* カードグリッド */}
        <div
          role="radiogroup"
          aria-label="振り返りフレームワーク"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {frameworks.map((framework) => {
            const isSelected = selectedFrameworkId === framework.id;

            return (
              <button
                key={framework.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => selectFramework(framework.id)}
                className="text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Card
                  className={`
                    cursor-pointer transition-all duration-200 hover:shadow-md
                    ${isSelected
                      ? 'border-2 border-blue-500 bg-blue-50 shadow-lg'
                      : 'border border-gray-200 hover:border-blue-300'
                    }
                  `}
                >
                  <div className="p-4 text-center space-y-2">
                    {/* アイコン */}
                    <div className="text-4xl mb-2">
                      {framework.icon || '📋'}
                    </div>

                    {/* フレームワーク名 */}
                    <h4 className="font-semibold text-gray-900">
                      {framework.name}
                    </h4>

                    {/* 説明（2行まで） */}
                    {framework.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 min-h-[2.5rem]">
                        {framework.description}
                      </p>
                    )}

                    {/* 項目数 */}
                    {framework.schema && framework.schema.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          {framework.schema.length}項目
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択されたフレームワークの詳細（下部に表示） */}
      {selectedFramework && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{selectedFramework.icon || '📋'}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {selectedFramework.name}
                </h4>
                {selectedFramework.description && (
                  <p className="text-sm text-gray-700">
                    {selectedFramework.description}
                  </p>
                )}
              </div>
            </div>

            {selectedFramework.schema && selectedFramework.schema.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  記入項目:
                </p>
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
        </Card>
      )}
    </div>
  );
}