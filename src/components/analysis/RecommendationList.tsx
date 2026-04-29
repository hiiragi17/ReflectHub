'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Compass } from 'lucide-react';
import type { AnalysisRecommendations } from '@/types/analysis';

interface RecommendationListProps {
  recommendations: AnalysisRecommendations;
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  const { actions, focus_areas } = recommendations;
  const isEmpty = actions.length === 0 && focus_areas.length === 0;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">レコメンデーション</h3>

        {isEmpty ? (
          <p className="text-xs text-gray-500">推奨事項は生成されませんでした。</p>
        ) : (
          <div className="space-y-4">
            {actions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">
                    次に取るべきアクション
                  </span>
                </div>
                <ol className="space-y-1.5 list-decimal list-inside marker:text-gray-400">
                  {actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed">
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {focus_areas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-gray-700">
                    中期的な注力テーマ
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {focus_areas.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-xs"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
