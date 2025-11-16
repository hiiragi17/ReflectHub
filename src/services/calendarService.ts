import {
  CalendarDayData,
  MonthlyCalendarData,
  WeeklyStats,
  MonthlyStats,
} from '@/types/calendar';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

/**
 * Calendar Service - Transforms reflection data for calendar display
 * Handles data grouping, statistics calculation, and formatting
 */

/**
 * Parse date string (YYYY-MM-DD format) to Date object
 */
const parseReflectionDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format Date object to YYYY-MM-DD string
 */
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get all days in a month, including partial weeks from previous/next months
 */
const getAllDaysInCalendarMonth = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Get the first Monday of the calendar (may be in previous month)
  const startDate = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  // In Japan, weeks start on Sunday (dayOfWeek: 0 = Sunday)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToSubtract);

  // Get the last Sunday of the calendar (may be in next month)
  const endDate = new Date(lastDay);
  const daysToAdd = (7 - (lastDay.getDay() === 0 ? 0 : lastDay.getDay())) % 7;
  endDate.setDate(endDate.getDate() + daysToAdd);

  // Generate array of all days
  const allDays: Date[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    allDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return allDays;
};

/**
 * Group reflections by date (YYYY-MM-DD)
 */
const groupReflectionsByDate = (
  reflections: Reflection[]
): Map<string, Reflection[]> => {
  const map = new Map<string, Reflection[]>();

  reflections.forEach((reflection) => {
    const dateKey = reflection.reflection_date; // Already in YYYY-MM-DD format
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey)!.push(reflection);
  });

  return map;
};

/**
 * Get framework colors for a date
 */
const getFrameworkColorsForDate = (
  reflections: Reflection[],
  frameworks: Framework[]
): string[] => {
  const colors = reflections.map((reflection) => {
    const framework = frameworks.find((f) => f.id === reflection.framework_id);
    return framework?.color || '#6B7280';
  });
  return [...new Set(colors)]; // Remove duplicates
};

/**
 * Get framework IDs for a date
 */
const getFrameworkIdsForDate = (reflections: Reflection[]): string[] => {
  const ids = reflections.map((r) => r.framework_id);
  return [...new Set(ids)]; // Remove duplicates
};

/**
 * Create calendar day data for a specific date
 */
const createCalendarDayData = (
  date: Date,
  reflectionsByDate: Map<string, Reflection[]>,
  frameworks: Framework[]
): CalendarDayData => {
  const dateStr = formatDateToString(date);
  const reflections = reflectionsByDate.get(dateStr) || [];
  const frameworkIds = getFrameworkIdsForDate(reflections);
  const frameworkColors = getFrameworkColorsForDate(reflections, frameworks);

  return {
    date: dateStr,
    dateObject: date,
    reflections,
    frameworkIds,
    frameworkColors,
    count: reflections.length,
  };
};

/**
 * Get week number of month for a date (1-5)
 */
const getWeekNumberOfMonth = (date: Date): number => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const dateOfMonth = date.getDate();
  const weekNumber = Math.ceil((dateOfMonth + firstDayOfWeek - 1) / 7);
  return weekNumber;
};

/**
 * Calculate weekly statistics for the month
 */
const calculateWeeklyStats = (
  days: CalendarDayData[],
  _frameworks: Framework[]
): WeeklyStats[] => {
  const weeks: Map<number, CalendarDayData[]> = new Map();

  // Group days by week
  days.forEach((day) => {
    const weekNumber = getWeekNumberOfMonth(day.dateObject);
    if (!weeks.has(weekNumber)) {
      weeks.set(weekNumber, []);
    }
    weeks.get(weekNumber)!.push(day);
  });

  // Calculate stats for each week
  const weeklyStats: WeeklyStats[] = [];
  weeks.forEach((weekDays, weekNumber) => {
    const reflectionDates = weekDays
      .filter((d) => d.count > 0)
      .map((d) => d.date);

    const allFrameworkIds = new Set<string>();
    weekDays.forEach((day) => {
      day.frameworkIds.forEach((id) => allFrameworkIds.add(id));
    });

    const startDate = weekDays[0].dateObject;
    const endDate = weekDays[weekDays.length - 1].dateObject;

    weeklyStats.push({
      weekNumber,
      startDate,
      endDate,
      reflectionCount: reflectionDates.length,
      reflectionDates,
      frameworks: Array.from(allFrameworkIds),
    });
  });

  return weeklyStats;
};

/**
 * Calculate consecutive days with reflections (up to today)
 */
const calculateConsecutiveDays = (
  reflectionsByDate: Map<string, Reflection[]>
): number => {
  const today = new Date();

  let consecutive = 0;
  const checkDate = new Date(today);

  while (true) {
    const dateStr = formatDateToString(checkDate);
    const hasReflection = reflectionsByDate.has(dateStr);

    if (!hasReflection) {
      break;
    }

    consecutive++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return consecutive;
};

/**
 * Calculate monthly statistics
 */
const calculateMonthlyStats = (
  days: CalendarDayData[],
  frameworks: Framework[]
): MonthlyStats => {
  const totalReflections = days.reduce((sum, day) => sum + day.count, 0);
  const uniqueDates = days.filter((day) => day.count > 0).length;
  const averagePerDay = uniqueDates > 0 ? totalReflections / uniqueDates : 0;

  // Framework breakdown
  const frameworkBreakdown: Record<string, { count: number; color: string }> = {};
  days.forEach((day) => {
    day.frameworkIds.forEach((frameworkId) => {
      if (!frameworkBreakdown[frameworkId]) {
        const framework = frameworks.find((f) => f.id === frameworkId);
        frameworkBreakdown[frameworkId] = {
          count: 0,
          color: framework?.color || '#6B7280',
        };
      }
      frameworkBreakdown[frameworkId].count +=
        day.reflections.filter((r) => r.framework_id === frameworkId).length;
    });
  });

  // Consecutive days
  const reflectionsByDate = new Map<string, Reflection[]>();
  days.forEach((day) => {
    if (day.count > 0) {
      reflectionsByDate.set(day.date, day.reflections);
    }
  });
  const consecutiveDays = calculateConsecutiveDays(reflectionsByDate);

  return {
    totalReflections,
    uniqueDates,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    frameworkBreakdown,
    consecutiveDays,
  };
};

/**
 * Transform reflections into monthly calendar data
 * @param year - Year (YYYY)
 * @param month - Month (1-12)
 * @param reflections - Array of reflection data
 * @param frameworks - Array of available frameworks
 * @returns MonthlyCalendarData
 */
export const transformToMonthlyCalendar = (
  year: number,
  month: number,
  reflections: Reflection[],
  frameworks: Framework[]
): MonthlyCalendarData => {
  // Filter reflections for the specified month
  const monthReflections = reflections.filter((reflection) => {
    const refDate = parseReflectionDate(reflection.reflection_date);
    return (
      refDate.getFullYear() === year &&
      refDate.getMonth() === month - 1
    );
  });

  // Group reflections by date
  const reflectionsByDate = groupReflectionsByDate(monthReflections);

  // Get all days in the calendar month
  const allDays = getAllDaysInCalendarMonth(year, month);

  // Create calendar day data for each day
  const days = allDays.map((date) =>
    createCalendarDayData(date, reflectionsByDate, frameworks)
  );

  // Calculate statistics
  const weeklyStats = calculateWeeklyStats(days, frameworks);
  const monthlyStats = calculateMonthlyStats(days, frameworks);

  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0),
    days,
    reflectionsByDate,
    weeklyStats,
    monthlyStats,
  };
};

/**
 * Get reflections for a specific date range (for month view optimization)
 * @param reflections - All reflections
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered reflections
 */
export const filterReflectionsByDateRange = (
  reflections: Reflection[],
  startDate: Date,
  endDate: Date
): Reflection[] => {
  const start = formatDateToString(startDate);
  const end = formatDateToString(endDate);

  return reflections.filter((reflection) => {
    const refDate = reflection.reflection_date;
    return refDate >= start && refDate <= end;
  });
};

/**
 * Get a month's data in a format optimized for calendar display
 * @param year - Year
 * @param month - Month (1-12)
 * @param reflections - All reflections
 * @param frameworks - All frameworks
 * @returns MonthlyCalendarData with only relevant data
 */
export const getMonthCalendarData = (
  year: number,
  month: number,
  reflections: Reflection[],
  frameworks: Framework[]
): MonthlyCalendarData => {
  return transformToMonthlyCalendar(year, month, reflections, frameworks);
};

/**
 * Calculate statistics for current month up to today
 * @param reflectionsByDate - Map of reflections by date
 * @param frameworks - Available frameworks
 * @returns MonthlyStats for current month
 */
export const getCurrentMonthStats = (
  reflectionsByDate: Map<string, Reflection[]>,
  frameworks: Framework[]
): MonthlyStats => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Create temporary days for stats calculation
  const days: CalendarDayData[] = [];
  reflectionsByDate.forEach((reflections, dateStr) => {
    const date = parseReflectionDate(dateStr);
    if (
      date.getFullYear() === currentYear &&
      date.getMonth() === currentMonth - 1
    ) {
      days.push({
        date: dateStr,
        dateObject: date,
        reflections,
        frameworkIds: getFrameworkIdsForDate(reflections),
        frameworkColors: getFrameworkColorsForDate(reflections, frameworks),
        count: reflections.length,
      });
    }
  });

  return calculateMonthlyStats(days, frameworks);
};

export const calendarService = {
  transformToMonthlyCalendar,
  filterReflectionsByDateRange,
  getMonthCalendarData,
  getCurrentMonthStats,
};
