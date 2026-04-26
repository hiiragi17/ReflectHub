'use client';

import { Flame, Trophy, CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyStreakStats } from '@/types/analytics';

export interface StreakDisplayProps {
  streak: WeeklyStreakStats;
}

export default function StreakDisplay({ streak }: StreakDisplayProps) {
  const items = [
    {
      label: '連続記録週数',
      value: streak.currentStreak,
      Icon: Flame,
      color: 'text-orange-500',
    },
    {
      label: 'ベスト連続週数',
      value: streak.bestStreak,
      Icon: Trophy,
      color: 'text-yellow-500',
    },
    {
      label: '総振り返り週数',
      value: streak.totalActiveWeeks,
      Icon: CalendarCheck,
      color: 'text-blue-500',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">ストリーク（週単位）</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map(({ label, value, Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`w-7 h-7 mx-auto mb-2 ${color}`} />
              <p className="text-2xl font-bold text-gray-900">
                {value}
                <span className="text-base font-medium text-gray-500 ml-1">週</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
