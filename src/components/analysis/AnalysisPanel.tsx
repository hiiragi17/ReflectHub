'use client';

import React from 'react';
import { Sparkles, TrendingUp, Lightbulb, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { InsightCard } from './InsightCard';
import { RecommendationList } from './RecommendationList';
import { EmotionalTrend } from './EmotionalTrend';

interface AnalysisPanelProps {
  reflectionId: string;
}

function formatCreatedAt(value: string): string {
  try {
    const date = parseISO(value);
    if (!Number.isNaN(date.getTime())) {
      return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
    }
  } catch {
    // ignore
  }
  return value;
}

export function AnalysisPanel({ reflectionId }: AnalysisPanelProps) {
  const { analysis, isLoading, isAnalyzing, error, rateLimit, analyze } =
    useAIAnalysis(reflectionId);

  const buttonLabel = analysis ? '再分析する' : 'AI 分析を実行';

  return (
    <Card data-testid="analysis-panel">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI による分析</h2>
          </div>
          <div className="flex items-center gap-3">
            {rateLimit && (
              <span className="text-xs text-gray-500">
                残り {rateLimit.remaining} / {rateLimit.limit} 回
              </span>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => void analyze()}
              disabled={isAnalyzing || isLoading}
              variant={analysis ? 'outline' : 'default'}
            >
              <RefreshCw
                className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`}
              />
              {isAnalyzing ? '分析中…' : buttonLabel}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error.message}</p>
              {error.code === 'RATE_LIMITED' && (
                <p className="text-xs mt-1">
                  時間をおいて再度お試しください（1 日 3 回まで）。
                </p>
              )}
            </div>
          </div>
        )}

        {isLoading && !analysis ? (
          <p className="text-sm text-gray-500">分析結果を読み込み中…</p>
        ) : analysis ? (
          <div className="space-y-5">
            <EmotionalTrend trend={analysis.emotional_trend} />

            <div className="grid gap-4 md:grid-cols-2">
              <InsightCard
                title="成長ポイント"
                items={analysis.growth_points}
                icon={TrendingUp}
                iconColor="text-green-500"
                testId="growth-points"
              />
              <InsightCard
                title="改善提案"
                items={analysis.improvement_suggestions}
                icon={Lightbulb}
                iconColor="text-amber-500"
                testId="improvement-suggestions"
              />
              <InsightCard
                title="主要な成果"
                items={analysis.key_achievements}
                icon={Trophy}
                iconColor="text-yellow-500"
                testId="key-achievements"
              />
              <InsightCard
                title="課題"
                items={analysis.challenges}
                icon={AlertCircle}
                iconColor="text-red-500"
                testId="challenges"
              />
            </div>

            <RecommendationList recommendations={analysis.recommendations} />

            <p className="text-xs text-gray-500">
              生成日時: {formatCreatedAt(analysis.created_at)}（モデル: {analysis.metadata.model}）
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">
              この振り返りはまだ分析されていません。
            </p>
            <p className="text-xs text-gray-500 mt-1">
              「AI 分析を実行」を押すと、振り返り内容から成長ポイントや改善提案を生成します。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
