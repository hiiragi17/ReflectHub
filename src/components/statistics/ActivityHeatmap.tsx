'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HeatmapCell } from '@/types/analytics';

export interface ActivityHeatmapProps {
  heatmap: HeatmapCell[];
}

const intensityClass = (count: number): string => {
  if (count <= 0) return 'bg-gray-100';
  if (count === 1) return 'bg-emerald-200';
  if (count === 2) return 'bg-emerald-400';
  if (count === 3) return 'bg-emerald-500';
  return 'bg-emerald-600';
};

const formatRange = (weekStart: string): string => {
  const [y, m, d] = weekStart.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()}`;
  return `${fmt(start)} 〜 ${fmt(end)}`;
};

const legendSamples = [0, 1, 2, 3, 4];

export default function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const totalWeeks = heatmap.length;
  const activeWeeks = heatmap.filter((c) => c.count > 0).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">アクティビティ（直近{totalWeeks}週）</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {totalWeeks === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">
            データがありません
          </p>
        ) : (
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div
              role="list"
              aria-label="週次アクティビティ"
              className="flex flex-wrap gap-1.5"
            >
              {heatmap.map((cell) => {
                const range = formatRange(cell.weekStart);
                const label = `${range}: ${cell.count}件`;
                return (
                  <div
                    key={cell.weekStart}
                    role="listitem"
                    title={label}
                    aria-label={label}
                    data-count={cell.count}
                    className={`h-6 w-6 rounded-sm ${intensityClass(cell.count)}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {activeWeeks} / {totalWeeks} 週で記録
              </span>
              <div className="flex items-center gap-1">
                <span>少</span>
                {legendSamples.map((c) => (
                  <span
                    key={c}
                    className={`h-3 w-3 rounded-sm ${intensityClass(c)}`}
                    aria-hidden
                  />
                ))}
                <span>多</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
