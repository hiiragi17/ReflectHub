'use client';

import React, { useState, useMemo } from 'react';
import { CalendarEntry } from './CalendarEntry';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

interface CalendarProps {
  reflections: Reflection[];
  frameworks: Framework[];
  onDateClick: (date: Date, reflections: Reflection[]) => void;
}

/**
 * Calendar - Monthly calendar view with reflection indicators
 * Features:
 * - Month navigation (previous/next)
 * - Highlights dates with reflections
 * - Color-coded by framework type
 * - Click to view details
 */
export const Calendar: React.FC<CalendarProps> = ({
  reflections,
  frameworks,
  onDateClick,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get first day of the month and total days
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  // Calculate calendar grid (including days from previous/next month)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];

    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // Add days from previous month to fill the first week
    const daysFromPrevMonth = firstDayOfWeek;
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(firstDayOfMonth);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }

    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    }

    // Add days from next month to complete the grid (6 weeks max)
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(lastDayOfMonth);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }, [firstDayOfMonth, lastDayOfMonth, currentDate]);

  // Group reflections by date (YYYY-MM-DD)
  const reflectionsByDate = useMemo(() => {
    const map = new Map<string, Reflection[]>();

    reflections.forEach((reflection) => {
      const dateKey = reflection.reflection_date; // Already in YYYY-MM-DD format
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(reflection);
    });

    return map;
  }, [reflections]);

  // Get reflections for a specific date
  const getReflectionsForDate = (date: Date): Reflection[] => {
    const dateKey = formatDateKey(date);
    return reflectionsByDate.get(dateKey) || [];
  };

  // Format date as YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date): boolean => {
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    );
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year for display
  const monthYearDisplay = useMemo(() => {
    return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
  }, [currentDate]);

  // Weekday headers
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{monthYearDisplay}</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="前の月"
          >
            ← 前月
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="今月"
          >
            今月
          </button>

          <button
            onClick={goToNextMonth}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="次の月"
          >
            次月 →
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {weekdays.map((day, index) => (
            <div
              key={day}
              className={`
                text-center py-2 text-sm font-semibold
                ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'}
              `}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const dateReflections = getReflectionsForDate(date);

            return (
              <CalendarEntry
                key={index}
                date={date}
                reflections={dateReflections}
                frameworks={frameworks}
                isCurrentMonth={isCurrentMonth(date)}
                isToday={isToday(date)}
                onClick={onDateClick}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {frameworks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">フレームワーク</h3>
          <div className="flex flex-wrap gap-3">
            {frameworks.map((framework) => (
              <div key={framework.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: framework.color || '#6B7280' }}
                />
                <span className="text-sm text-gray-700">
                  {framework.icon} {framework.display_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
