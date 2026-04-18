'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsTrends, TrendPoint } from '@/types/analytics';

type ViewMode = 'weekly' | 'monthly';

export interface TrendChartProps {
  trends: AnalyticsTrends;
}

const formatPeriodLabel = (point: TrendPoint, mode: ViewMode): string => {
  if (mode === 'monthly') return point.period;
  return point.period.split(' 〜 ')[0];
};

export default function TrendChart({ trends }: TrendChartProps) {
  const [mode, setMode] = useState<ViewMode>('weekly');

  const data = useMemo(() => {
    const points = mode === 'weekly' ? trends.weekly : trends.monthly;
    return points.map((point) => ({
      label: formatPeriodLabel(point, mode),
      count: point.count,
      characters: point.characters,
    }));
  }, [mode, trends]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">振り返り推移</CardTitle>
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            type="button"
            onClick={() => setMode('weekly')}
            aria-pressed={mode === 'weekly'}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === 'weekly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            週次
          </button>
          <button
            type="button"
            onClick={() => setMode('monthly')}
            aria-pressed={mode === 'monthly'}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              mode === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            月次
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
                formatter={(value, name) => {
                  if (name === 'count') return [`${value} 件`, '振り返り数'];
                  if (name === 'characters') return [`${value} 文字`, '合計文字数'];
                  return [String(value), String(name)];
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
