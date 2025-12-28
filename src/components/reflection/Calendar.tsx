'use client';

import React, { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { ja } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
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
  // Group reflections by date (YYYY-MM-DD)
  const reflectionsByDate = useMemo(() => {
    const map = new Map<string, Reflection[]>();

    reflections.forEach((reflection) => {
      // Use created_at date instead of reflection_date
      const dateKey = reflection.created_at?.split('T')[0] || reflection.reflection_date;
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

  // Get dates with reflections
  const datesWithReflections = useMemo(() => {
    return Array.from(reflectionsByDate.keys()).map((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [reflectionsByDate]);

  // Handle day click
  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    const dateReflections = getReflectionsForDate(date);
    if (dateReflections.length > 0) {
      onDateClick(date, dateReflections);
    }
  };

  // Create framework color modifiers for each date
  const frameworkModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};

    frameworks.forEach((framework) => {
      const datesForFramework: Date[] = [];

      reflectionsByDate.forEach((refls, dateStr) => {
        const hasThisFramework = refls.some((r) => r.framework_id === framework.id);
        if (hasThisFramework) {
          const [year, month, day] = dateStr.split('-').map(Number);
          datesForFramework.push(new Date(year, month - 1, day));
        }
      });

      if (datesForFramework.length > 0) {
        modifiers[`framework-${framework.id}`] = datesForFramework;
      }
    });

    return modifiers;
  }, [reflectionsByDate, frameworks]);

  // Create dynamic styles for framework colors
  const frameworkStyles = useMemo(() => {
    return frameworks.map((framework) => {
      const color = framework.color || '#6B7280';
      return `
        .rdp-day.framework-${framework.id}::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: ${color};
        }
      `;
    }).join('\n');
  }, [frameworks]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <style jsx global>{`
        ${frameworkStyles}
        /* Calendar container */
        .rdp {
          --rdp-cell-size: 80px;
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: #eff6ff;
          margin: 0;
        }

        /* Month navigation */
        .rdp-caption {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .rdp-caption_label {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .rdp-nav {
          display: flex;
          gap: 0.5rem;
        }

        .rdp-nav_button {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          background-color: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .rdp-nav_button:hover {
          background-color: #f9fafb;
        }

        .rdp-nav_button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Table */
        .rdp-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        /* Weekday headers */
        .rdp-head_cell {
          text-align: center;
          padding: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .rdp-head_row th:first-child {
          color: #dc2626; /* Sunday - red */
        }

        .rdp-head_row th:last-child {
          color: #2563eb; /* Saturday - blue */
        }

        /* Day cells */
        .rdp-cell {
          padding: 2px;
        }

        .rdp-day {
          width: var(--rdp-cell-size);
          height: var(--rdp-cell-size);
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background-color: white;
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          cursor: default;
          transition: all 0.15s;
          position: relative;
        }

        .rdp-day:hover {
          background-color: #f9fafb;
        }

        /* Days outside current month */
        .rdp-day_outside {
          background-color: #f9fafb;
          color: #9ca3af;
        }

        /* Today */
        .rdp-day_today {
          font-weight: 700;
          color: #2563eb;
          border: 2px solid #3b82f6;
        }

        /* Days with reflections */
        .rdp-day_has-reflection {
          background-color: #eff6ff;
          cursor: pointer;
        }

        .rdp-day_has-reflection:hover {
          background-color: #dbeafe;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        /* Selected day */
        .rdp-day_selected {
          background-color: var(--rdp-accent-color);
          color: white;
        }

        .rdp-day_selected:hover {
          background-color: #2563eb;
        }

        /* Disabled days */
        .rdp-day_disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Day content wrapper */
        .rdp-day_content {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        /* Multiple framework indicators */
        .rdp-day.has-multiple-frameworks::before {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-12px);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #9ca3af;
        }
      `}</style>

      <DayPicker
        mode="single"
        locale={ja}
        modifiers={{
          hasReflection: datesWithReflections,
          ...frameworkModifiers,
        }}
        modifiersClassNames={{
          hasReflection: 'rdp-day_has-reflection',
          ...Object.keys(frameworkModifiers).reduce((acc, key) => {
            acc[key] = key;
            return acc;
          }, {} as Record<string, string>),
        }}
        onDayClick={handleDayClick}
      />

      {/* Legend */}
      {frameworks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">フレームワーク</h3>
          <div className="flex flex-wrap gap-3">
            {frameworks.map((framework) => (
              <div key={framework.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
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
