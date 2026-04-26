'use client';

import Link from 'next/link';
import { CheckCircle2, Clock, PenSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ThisWeekStatus } from '@/types/analytics';

export interface ThisWeekStatusProps {
  status: ThisWeekStatus;
  reflectionHref?: string;
}

export default function ThisWeekStatusCard({
  status,
  reflectionHref = '/reflection',
}: ThisWeekStatusProps) {
  const { recorded, thisWeekCount } = status;

  const StatusIcon = recorded ? CheckCircle2 : Clock;
  const statusLabel = recorded ? `記録済 (${thisWeekCount}件)` : '未記録';
  const statusColor = recorded ? 'text-emerald-500' : 'text-gray-400';
  const helperText = recorded
    ? '今週の振り返りはバッチリです。'
    : '今週はまだ振り返りが記録されていません。';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">今週の状況</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-10 h-10 ${statusColor}`} aria-hidden="true" />
          <div>
            <p className="text-xs text-gray-500">今週</p>
            <p className="text-2xl font-bold text-gray-900">{statusLabel}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500">{helperText}</p>

        {!recorded && (
          <Link
            href={reflectionHref}
            className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium transition-colors"
          >
            <PenSquare className="w-4 h-4" aria-hidden="true" />
            振り返りを書く
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
