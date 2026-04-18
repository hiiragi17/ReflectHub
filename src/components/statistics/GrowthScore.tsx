'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface GrowthScoreProps {
  score: number;
}

const getScoreLevel = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: '素晴らしい', color: '#10b981' };
  if (score >= 60) return { label: '順調', color: '#3b82f6' };
  if (score >= 40) return { label: '成長中', color: '#f59e0b' };
  if (score >= 20) return { label: 'スタート', color: '#f97316' };
  return { label: 'これから', color: '#94a3b8' };
};

export default function GrowthScore({ score }: GrowthScoreProps) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const clamped = Math.min(Math.max(Math.round(safeScore), 0), 100);
  const { label, color } = getScoreLevel(clamped);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">成長スコア</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-2">
          <div
            className="relative w-40 h-40"
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`成長スコア ${clamped} / 100 (${label})`}
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">{clamped}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>
        </div>
        <p className="text-center mt-3 text-sm font-medium" style={{ color }}>
          {label}
        </p>
        <p className="text-xs text-gray-500 text-center mt-2">
          頻度・継続・多様性・内容の深さから算出しています
        </p>
      </CardContent>
    </Card>
  );
}
