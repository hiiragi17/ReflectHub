'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
  iconColor?: string;
  description?: string;
}

export default function StatsCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-blue-500',
  description,
}: StatsCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm text-gray-600">{label}</p>
          {Icon && <Icon className={cn('w-5 h-5', iconColor)} />}
        </div>
        <p className="text-3xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-base font-medium text-gray-500 ml-1">{unit}</span>}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
