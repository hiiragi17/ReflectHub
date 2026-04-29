'use client';

import React from 'react';
import { Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmotionalTrend as EmotionalTrendType } from '@/types/analysis';

interface EmotionalTrendProps {
  trend: EmotionalTrendType;
}

const TREND_CONFIG: Record<
  EmotionalTrendType,
  { label: string; icon: typeof Smile; bg: string; text: string; description: string }
> = {
  positive: {
    label: 'ポジティブ',
    icon: Smile,
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    description: '前向きな振り返りです。この勢いを維持しましょう。',
  },
  neutral: {
    label: 'ニュートラル',
    icon: Meh,
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    description: '落ち着いたトーンの振り返りです。',
  },
  negative: {
    label: '課題あり',
    icon: Frown,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    description: '困難な状況が読み取れます。改善提案も参考にしてみてください。',
  },
};

export function EmotionalTrend({ trend }: EmotionalTrendProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4',
        config.bg,
      )}
      data-testid="emotional-trend"
    >
      <Icon className={cn('w-6 h-6 flex-shrink-0', config.text)} />
      <div>
        <p className={cn('text-sm font-semibold', config.text)}>
          感情トレンド: {config.label}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">{config.description}</p>
      </div>
    </div>
  );
}
