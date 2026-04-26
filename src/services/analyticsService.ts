import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';
import type {
  AnalyticsSummary,
  AnalyticsTrends,
  AnalyticsDistribution,
  BasicStats,
  StreakStats,
  WeeklyStreakStats,
  HeatmapCell,
  PeriodComparison,
  FrameworkDistribution,
  TrendPoint,
} from '@/types/analytics';

export const DEFAULT_HEATMAP_WEEKS = 12;

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatYearMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const countCharacters = (reflection: Reflection): number => {
  return Object.values(reflection.content || {}).reduce(
    (sum, value) => sum + (value ? value.length : 0),
    0,
  );
};

const isInMonth = (date: Date, year: number, month: number): boolean => {
  return date.getFullYear() === year && date.getMonth() === month;
};

const isInRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

export const calculateBasicStats = (
  reflections: Reflection[],
  now: Date = new Date(),
): BasicStats => {
  const total = reflections.length;
  const totalChars = reflections.reduce((sum, r) => sum + countCharacters(r), 0);
  const averageCharacters = total > 0 ? Math.round(totalChars / total) : 0;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const previousMonth = addMonths(now, -1);
  const currentWeekStart = startOfWeek(now);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const previousWeekEnd = addDays(currentWeekStart, -1);

  let thisMonth = 0;
  let lastMonth = 0;
  let thisWeek = 0;
  let lastWeek = 0;

  reflections.forEach((reflection) => {
    const date = parseDate(reflection.reflection_date);

    if (isInMonth(date, currentYear, currentMonth)) {
      thisMonth++;
    }
    if (isInMonth(date, previousMonth.getFullYear(), previousMonth.getMonth())) {
      lastMonth++;
    }
    if (isInRange(date, currentWeekStart, currentWeekEnd)) {
      thisWeek++;
    }
    if (isInRange(date, previousWeekStart, previousWeekEnd)) {
      lastWeek++;
    }
  });

  return {
    total,
    thisMonth,
    lastMonth,
    thisWeek,
    lastWeek,
    averageCharacters,
  };
};

export const calculateStreak = (
  reflections: Reflection[],
  now: Date = new Date(),
): StreakStats => {
  if (reflections.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalActiveDays: 0 };
  }

  const dateSet = new Set(reflections.map((r) => r.reflection_date));
  const totalActiveDays = dateSet.size;

  const sortedDates = Array.from(dateSet).sort();

  let bestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  sortedDates.forEach((dateStr) => {
    const date = parseDate(dateStr);
    if (previousDate) {
      const diff = Math.round(
        (date.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    } else {
      runningStreak = 1;
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    previousDate = date;
  });

  let currentStreak = 0;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));

  let checkDate: Date;
  if (dateSet.has(todayStr)) {
    checkDate = new Date(today);
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = addDays(today, -1);
  } else {
    return { currentStreak: 0, bestStreak, totalActiveDays };
  }

  while (dateSet.has(formatDate(checkDate))) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  return { currentStreak, bestStreak, totalActiveDays };
};

/**
 * Weekly streak using ISO-style Monday-start weeks. Each reflection is bucketed
 * into the week containing its reflection_date; consecutive weeks of activity
 * form a streak. Mirrors calculateStreak's "today or yesterday" tolerance:
 * the current week or the previous week may anchor the running streak.
 */
export const calculateWeeklyStreak = (
  reflections: Reflection[],
  now: Date = new Date(),
): WeeklyStreakStats => {
  if (reflections.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalActiveWeeks: 0 };
  }

  const weekSet = new Set<string>();
  reflections.forEach((r) => {
    const weekStart = startOfWeek(parseDate(r.reflection_date));
    weekSet.add(formatDate(weekStart));
  });
  const totalActiveWeeks = weekSet.size;

  const sortedWeeks = Array.from(weekSet).sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let previousWeek: Date | null = null;

  sortedWeeks.forEach((weekStr) => {
    const weekDate = parseDate(weekStr);
    if (previousWeek) {
      const diff = Math.round(
        (weekDate.getTime() - previousWeek.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 7) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    } else {
      runningStreak = 1;
    }
    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }
    previousWeek = weekDate;
  });

  const thisWeekStart = startOfWeek(now);
  const thisWeekStr = formatDate(thisWeekStart);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekStr = formatDate(lastWeekStart);

  let checkWeek: Date;
  if (weekSet.has(thisWeekStr)) {
    checkWeek = thisWeekStart;
  } else if (weekSet.has(lastWeekStr)) {
    checkWeek = lastWeekStart;
  } else {
    return { currentStreak: 0, bestStreak, totalActiveWeeks };
  }

  let currentStreak = 0;
  while (weekSet.has(formatDate(checkWeek))) {
    currentStreak++;
    checkWeek = addDays(checkWeek, -7);
  }

  return { currentStreak, bestStreak, totalActiveWeeks };
};

export const buildWeeklyHeatmap = (
  reflections: Reflection[],
  weeks: number = DEFAULT_HEATMAP_WEEKS,
  now: Date = new Date(),
): HeatmapCell[] => {
  const currentWeekStart = startOfWeek(now);
  const buckets = new Map<string, HeatmapCell>();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const key = formatDate(weekStart);
    buckets.set(key, { weekStart: key, count: 0 });
  }

  reflections.forEach((r) => {
    const weekStart = startOfWeek(parseDate(r.reflection_date));
    const key = formatDate(weekStart);
    const cell = buckets.get(key);
    if (cell) {
      cell.count++;
    }
  });

  return Array.from(buckets.values());
};

const toComparison = (current: number, previous: number): PeriodComparison => {
  const change = current - previous;
  const changeRate = previous === 0 ? (current > 0 ? 100 : 0) : (change / previous) * 100;
  return {
    current,
    previous,
    change,
    changeRate: Math.round(changeRate * 10) / 10,
  };
};

export const calculateMonthComparison = (stats: BasicStats): PeriodComparison => {
  return toComparison(stats.thisMonth, stats.lastMonth);
};

export const calculateWeekComparison = (stats: BasicStats): PeriodComparison => {
  return toComparison(stats.thisWeek, stats.lastWeek);
};

export const calculateFrameworkDistribution = (
  reflections: Reflection[],
  frameworks: Framework[],
): FrameworkDistribution[] => {
  const counts = new Map<string, number>();
  reflections.forEach((r) => {
    counts.set(r.framework_id, (counts.get(r.framework_id) || 0) + 1);
  });

  const total = reflections.length;

  const result: FrameworkDistribution[] = [];
  counts.forEach((count, frameworkId) => {
    const framework = frameworks.find((f) => f.id === frameworkId);
    result.push({
      frameworkId,
      name: framework?.name || 'unknown',
      displayName: framework?.display_name || '不明なフレームワーク',
      color: framework?.color || '#6B7280',
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    });
  });

  return result.sort((a, b) => b.count - a.count);
};

const buildWeeklyTrend = (
  reflections: Reflection[],
  weeks: number,
  now: Date,
): TrendPoint[] => {
  const currentWeekStart = startOfWeek(now);
  const buckets = new Map<string, TrendPoint>();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    const key = formatDate(weekStart);
    buckets.set(key, {
      period: `${formatDate(weekStart)} 〜 ${formatDate(weekEnd)}`,
      count: 0,
      characters: 0,
    });
  }

  reflections.forEach((r) => {
    const date = parseDate(r.reflection_date);
    const weekStart = startOfWeek(date);
    const key = formatDate(weekStart);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.characters += countCharacters(r);
    }
  });

  return Array.from(buckets.values());
};

const buildMonthlyTrend = (
  reflections: Reflection[],
  months: number,
  now: Date,
): TrendPoint[] => {
  const buckets = new Map<string, TrendPoint>();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = addMonths(now, -i);
    const key = formatYearMonth(monthDate);
    buckets.set(key, {
      period: key,
      count: 0,
      characters: 0,
    });
  }

  reflections.forEach((r) => {
    const date = parseDate(r.reflection_date);
    const key = formatYearMonth(date);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.characters += countCharacters(r);
    }
  });

  return Array.from(buckets.values());
};

export const calculateTrends = (
  reflections: Reflection[],
  now: Date = new Date(),
  options: { weeks?: number; months?: number } = {},
): AnalyticsTrends => {
  const { weeks = 12, months = 6 } = options;
  return {
    weekly: buildWeeklyTrend(reflections, weeks, now),
    monthly: buildMonthlyTrend(reflections, months, now),
  };
};

export const getSummary = (
  reflections: Reflection[],
  now: Date = new Date(),
): AnalyticsSummary => {
  const basicStats = calculateBasicStats(reflections, now);
  const streak = calculateStreak(reflections, now);
  const weeklyStreak = calculateWeeklyStreak(reflections, now);
  const weeklyHeatmap = buildWeeklyHeatmap(reflections, DEFAULT_HEATMAP_WEEKS, now);
  const monthComparison = calculateMonthComparison(basicStats);
  const weekComparison = calculateWeekComparison(basicStats);

  return {
    basicStats,
    streak,
    weeklyStreak,
    weeklyHeatmap,
    monthComparison,
    weekComparison,
  };
};

export const getTrends = (
  reflections: Reflection[],
  now: Date = new Date(),
  options?: { weeks?: number; months?: number },
): AnalyticsTrends => {
  return calculateTrends(reflections, now, options);
};

export const getDistribution = (
  reflections: Reflection[],
  frameworks: Framework[],
): AnalyticsDistribution => {
  return {
    frameworks: calculateFrameworkDistribution(reflections, frameworks),
  };
};

export const analyticsService = {
  getSummary,
  getTrends,
  getDistribution,
  calculateBasicStats,
  calculateStreak,
  calculateWeeklyStreak,
  buildWeeklyHeatmap,
  calculateMonthComparison,
  calculateWeekComparison,
  calculateFrameworkDistribution,
  calculateTrends,
};
