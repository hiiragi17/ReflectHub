'use client';

import React from 'react';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

interface CalendarEntryProps {
  date: Date;
  reflections: Reflection[];
  frameworks: Framework[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: Date, reflections: Reflection[]) => void;
}

/**
 * CalendarEntry - Individual calendar cell component
 * Displays a single date with reflection indicators
 */
export const CalendarEntry: React.FC<CalendarEntryProps> = ({
  date,
  reflections,
  frameworks,
  isCurrentMonth,
  isToday,
  onClick,
}) => {
  const hasReflections = reflections.length > 0;

  // Get framework colors for reflections on this date
  const getFrameworkColor = (frameworkId: string): string => {
    const framework = frameworks.find((f) => f.id === frameworkId);
    return framework?.color || '#6B7280'; // Default gray
  };

  // Handle click event
  const handleClick = () => {
    if (hasReflections) {
      onClick(date, reflections);
    }
  };

  return (
    <div
      className={`
        min-h-[80px] p-2 border border-gray-200
        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
        ${hasReflections ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${isToday ? 'ring-2 ring-blue-500' : ''}
        transition-colors duration-150
      `}
      onClick={handleClick}
      role={hasReflections ? 'button' : 'cell'}
      tabIndex={hasReflections ? 0 : -1}
      onKeyDown={(e) => {
        if (hasReflections && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${date.getDate()}日${hasReflections ? ` - ${reflections.length}件の振り返り` : ''}`}
    >
      {/* Date number */}
      <div className={`
        text-sm font-medium mb-1
        ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
        ${isToday ? 'text-blue-600 font-bold' : ''}
      `}>
        {date.getDate()}
      </div>

      {/* Reflection indicators */}
      {hasReflections && (
        <div className="space-y-1">
          {reflections.map((reflection) => {
            const framework = frameworks.find((f) => f.id === reflection.framework_id);
            const color = getFrameworkColor(reflection.framework_id);

            return (
              <div
                key={reflection.id}
                className="text-xs px-1.5 py-0.5 rounded truncate"
                style={{
                  backgroundColor: `${color}20`, // 20% opacity
                  borderLeft: `3px solid ${color}`,
                }}
                title={`${framework?.display_name || '振り返り'}`}
              >
                <span className="font-medium">
                  {framework?.icon || '📝'} {framework?.display_name || '振り返り'}
                </span>
              </div>
            );
          })}

          {/* Show count if more than 2 reflections */}
          {reflections.length > 2 && (
            <div className="text-xs text-gray-500 px-1.5">
              +{reflections.length - 2}件
            </div>
          )}
        </div>
      )}
    </div>
  );
};
