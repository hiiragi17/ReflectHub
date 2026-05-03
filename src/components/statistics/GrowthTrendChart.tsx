'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsTrends } from '@/types/analytics';

export interface GrowthTrendChartProps {
  trends: AnalyticsTrends;
  months?: number;
}

const DEFAULT_MONTHS = 3;

export default function GrowthTrendChart({
  trends,
  months = DEFAULT_MONTHS,
}: GrowthTrendChartProps) {
  const normalizedMonths =
    Number.isFinite(months) && months > 0 ? Math.floor(months) : DEFAULT_MONTHS;

  const data = useMemo(() => {
    const recent = trends.monthly.slice(-normalizedMonths);
    let cumulative = 0;
    return recent.map((point) => {
      cumulative += point.count;
      return {
        label: point.period,
        cumulative,
        added: point.count,
      };
    });
  }, [trends, normalizedMonths]);

  const totalAdded = data.reduce((sum, point) => sum + point.added, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{normalizedMonths}ヶ月の成長</CardTitle>
        <p className="text-sm text-gray-500">
          直近{normalizedMonths}ヶ月で <span className="font-semibold text-gray-900">{totalAdded}</span> 件
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
                  if (name === 'cumulative') return [`${value} 件`, '累積振り返り数'];
                  if (name === 'added') return [`${value} 件`, '当月の追加'];
                  return [String(value), String(name)];
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#growthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
