'use client';

import React from 'react';
import {
  Sparkles,
  Repeat,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAISummary } from '@/hooks/useAISummary';
import { InsightCard } from './InsightCard';
import { RecommendationList } from './RecommendationList';
import { MoodTrendBadge } from './MoodTrendBadge';
import type { SummaryPeriod } from '@/types/summary';

const PERIOD_LABEL: Record<SummaryPeriod, string> = {
  week: '今週',
  month: '今月',
  quarter: '今四半期',
};

const PERIODS: SummaryPeriod[] = ['week', 'month', 'quarter'];

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

export function SummaryPanel() {
  const {
    summary,
    isLoading,
    isAnalyzing,
    error,
    rateLimit,
    period,
    reflectionCount,
    minRequired,
    setPeriod,
    analyze,
  } = useAISummary('week');

  const buttonLabel = summary
    ? `${PERIOD_LABEL[period]}を再分析`
    : `${PERIOD_LABEL[period]}の振り返りを AI に分析させる`;

  // 件数取得済みで minRequired を満たさないときはボタンを無効化する。
  // 取得前 (null) は既存の挙動を維持。
  const insufficient =
    reflectionCount !== null &&
    minRequired !== null &&
    reflectionCount < minRequired;
  const shortfall = insufficient
    ? Math.max(0, (minRequired ?? 0) - (reflectionCount ?? 0))
    : 0;

  return (
    <Card data-testid="summary-panel">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              AI 期間サマリー分析
            </h2>
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
              disabled={isAnalyzing || isLoading || insufficient}
              variant={summary ? 'outline' : 'default'}
              data-testid="analyze-button"
              title={
                insufficient
                  ? `分析には ${minRequired} 件以上の振り返りが必要です（現在 ${reflectionCount} 件）`
                  : undefined
              }
            >
              <RefreshCw
                className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`}
              />
              {isAnalyzing ? '分析中…' : buttonLabel}
            </Button>
          </div>
        </div>

        <div
          className="flex gap-1 rounded-md bg-gray-100 p-1 w-fit"
          role="tablist"
          aria-label="分析期間"
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              disabled={isAnalyzing}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
              data-testid={`period-tab-${p}`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        {insufficient && !error && (
          <div
            data-testid="insufficient-notice"
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                分析にはあと {shortfall} 件の振り返りが必要です（現在 {reflectionCount} / {minRequired} 件）。
              </p>
              <p className="text-xs mt-1">
                期間サマリーは複数件の比較・推移から気づきを抽出するため、ある程度件数が貯まってから実行できます。
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-2 rounded-md border p-3 text-sm',
              error.code === 'INSUFFICIENT_REFLECTIONS' || error.code === 'NO_REFLECTIONS'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error.message}</p>
              {error.code === 'RATE_LIMITED' && (
                <p className="text-xs mt-1">
                  時間をおいて再度お試しください（1 日{rateLimit?.limit ?? 2} 回まで）。
                </p>
              )}
              {error.code === 'INSUFFICIENT_REFLECTIONS' && (
                <p className="text-xs mt-1">
                  期間サマリーは複数件の比較・推移から気づきを抽出するため、ある程度件数が必要です。
                </p>
              )}
            </div>
          </div>
        )}

        {isLoading && !summary ? (
          <p className="text-sm text-gray-500">分析結果を読み込み中…</p>
        ) : summary ? (
          <div className="space-y-5">
            <div className="text-xs text-gray-500">
              対象期間: {summary.period_start} 〜 {summary.period_end}（
              {summary.reflection_count} 件の振り返り）
            </div>

            <MoodTrendBadge trend={summary.mood_trend} />

            {summary.growth_summary && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                <h3 className="text-sm font-semibold text-indigo-900 mb-1">
                  期間全体の振り返り
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {summary.growth_summary}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                title="繰り返し出てくるテーマ"
                items={summary.recurring_themes}
                icon={Repeat}
                iconColor="text-blue-500"
                testId="recurring-themes"
              />
              <InsightCard
                title="継続できている習慣"
                items={summary.sustained_practices}
                icon={CheckCircle2}
                iconColor="text-green-500"
                testId="sustained-practices"
              />
              <InsightCard
                title="新しく出てきた課題"
                items={summary.emerging_challenges}
                icon={AlertCircle}
                iconColor="text-amber-500"
                testId="emerging-challenges"
              />
            </div>

            <RecommendationList recommendations={summary.recommendations} />

            <p className="text-xs text-gray-500">
              生成日時: {formatCreatedAt(summary.created_at)}（モデル:{' '}
              {summary.metadata.model}）
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">
              {PERIOD_LABEL[period]}の AI 分析はまだ生成されていません。
            </p>
            <p className="text-xs text-gray-500 mt-1">
              上のボタンを押すと、{PERIOD_LABEL[period]}の振り返りを横断的に分析し、
              繰り返し登場するテーマ・継続している習慣・新しく出てきた課題を抽出します。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
