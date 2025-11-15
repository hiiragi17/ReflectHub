import type { Reflection } from './reflection';
import type { Framework } from './framework';

/**
 * Calendar data for a specific date
 */
export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  dateObject: Date;
  reflections: Reflection[];
  frameworkIds: string[];
  frameworkColors: string[];
  count: number;
}

/**
 * Monthly calendar data structure
 */
export interface MonthlyCalendarData {
  year: number;
  month: number; // 1-12
  startDate: Date;
  endDate: Date;
  days: CalendarDayData[];
  reflectionsByDate: Map<string, Reflection[]>;
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats;
}

/**
 * Weekly statistics
 */
export interface WeeklyStats {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  reflectionCount: number;
  reflectionDates: string[]; // YYYY-MM-DD
  frameworks: string[]; // framework IDs
}

/**
 * Monthly statistics
 */
export interface MonthlyStats {
  totalReflections: number;
  uniqueDates: number;
  averagePerDay: number;
  frameworkBreakdown: Record<string, { count: number; color: string }>;
  consecutiveDays: number;
}

/**
 * Calendar view with frameworks
 */
export interface CalendarWithFrameworks {
  calendar: MonthlyCalendarData;
  frameworks: Framework[];
}
