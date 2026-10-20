'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  title: string;
  items: string[];
  icon?: LucideIcon;
  iconColor?: string;
  emptyMessage?: string;
  testId?: string;
}

export function InsightCard({
  title,
  items,
  icon: Icon,
  iconColor = 'text-blue-500',
  emptyMessage = '該当する項目はありませんでした。',
  testId,
}: InsightCardProps) {
  return (
    <Card className="h-full" data-testid={testId}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn('w-5 h-5', iconColor)} />}
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-gray-500">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 leading-relaxed flex gap-2"
              >
                <span className="text-gray-400 select-none">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
