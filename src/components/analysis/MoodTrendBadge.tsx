'use client';

import React from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MoodTrend } from '@/types/summary';

interface MoodTrendBadgeProps {
  trend: MoodTrend;
}

const TREND_CONFIG: Record<
  MoodTrend,
  { label: string; icon: typeof TrendingUp; bg: string; text: string; description: string }
> = {
  improving: {
    label: '上向き',
    icon: TrendingUp,
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    description: '期間を通じてポジティブな兆候が増えています。',
  },
  stable: {
    label: '安定',
    icon: Minus,
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    description: '大きな変化はなく、安定したペースを保っています。',
  },
  declining: {
    label: '下向き',
    icon: TrendingDown,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    description: 'ペースが落ちている可能性があります。レコメンデーションも参考にしてみてください。',
  },
};

export function MoodTrendBadge({ trend }: MoodTrendBadgeProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4',
        config.bg,
      )}
      data-testid="mood-trend"
    >
      <Icon className={cn('w-6 h-6 flex-shrink-0', config.text)} />
      <div>
        <p className={cn('text-sm font-semibold', config.text)}>
          ムードトレンド: {config.label}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">{config.description}</p>
      </div>
    </div>
  );
}
