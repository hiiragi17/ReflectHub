'use client';

import React from 'react';
import { useFrameworks } from '@/hooks/useFrameworks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FrameworkSelector() {
  const {
    frameworks,
    selectedFrameworkId,
    selectedFramework,
    isLoading,
    error,
    selectFramework,
    reload,
  } = useFrameworks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">振り返りの型を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card role="alert" className="p-4 border-red-200 bg-red-50">
        <div className="flex items-start gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-3">
            <p>
              振り返りの型を読み込めませんでした。通信状況を確認して、もう一度読み込んでください。
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              もう一度読み込む
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (frameworks.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-600">選べる振り返りの型がまだ登録されていません。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* フレームワーク選択グリッド */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          振り返りの型を選ぶ
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          どれか1つ選びます。切り替えても、このページを閉じるまで入力内容は残ります。
        </p>

        {/* カードグリッド */}
        <div
          role="radiogroup"
          aria-label="振り返りフレームワーク"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
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
                className="h-full text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Card
                  className={`
                    h-full cursor-pointer transition-all duration-200 hover:shadow-md
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

                    {/* 何に使う型か（初めてでも選べるように） */}
                    {framework.description && (
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {framework.description}
                      </p>
                    )}

                    {/* 項目数・選択状態（色だけに頼らず文字でも示す） */}
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-center gap-2 text-xs">
                      {framework.schema && framework.schema.length > 0 && (
                        <span className="text-gray-500">
                          {framework.schema.length}項目
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          選択中
                        </span>
                      )}
                    </div>
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
                <p className="text-sm text-gray-700">
                  この型で書く項目は次のとおりです。
                </p>
              </div>
            </div>

            {selectedFramework.schema && selectedFramework.schema.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  記入項目（<span className="text-red-600">*</span>は必須）:
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