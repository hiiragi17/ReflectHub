'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FrameworkDistribution } from '@/types/analytics';

export interface FrameworkBreakdownProps {
  distribution: FrameworkDistribution[];
}

export default function FrameworkBreakdown({ distribution }: FrameworkBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">フレームワーク分布</CardTitle>
      </CardHeader>
      <CardContent>
        {distribution.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">
            データがありません
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="count"
                  nameKey="displayName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {distribution.map((entry) => (
                    <Cell key={entry.frameworkId} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => {
                    const payload = (item as { payload?: { percentage?: number } } | undefined)
                      ?.payload;
                    const percentage = payload?.percentage ?? 0;
                    return [`${value} 件 (${percentage}%)`, String(name)];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
