'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PeriodComparison as PeriodComparisonData } from '@/types/analytics';

export interface PeriodComparisonProps {
  title: string;
  currentLabel: string;
  previousLabel: string;
  data: PeriodComparisonData;
}

export default function PeriodComparison({
  title,
  currentLabel,
  previousLabel,
  data,
}: PeriodComparisonProps) {
  const { current, previous, change, changeRate } = data;

  const isPositive = change > 0;
  const isNegative = change < 0;

  const color = isPositive
    ? 'text-emerald-600'
    : isNegative
      ? 'text-rose-600'
      : 'text-gray-500';

  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  const normalizedRate = Object.is(changeRate, -0) ? 0 : changeRate;
  const rateLabel = `${normalizedRate > 0 ? '+' : ''}${normalizedRate}%`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{previousLabel}</p>
            <p className="text-2xl font-semibold text-gray-700">{previous}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{currentLabel}</p>
            <p className="text-2xl font-semibold text-gray-900">{current}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 ${color}`}>
          <Icon className="w-5 h-5" />
          <span className="font-semibold">
            {change > 0 ? '+' : ''}
            {change} 件
          </span>
          <span className="text-sm">({rateLabel})</span>
        </div>
      </CardContent>
    </Card>
  );
}
