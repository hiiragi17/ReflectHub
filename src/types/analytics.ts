import type { Reflection } from './reflection';
import type { Framework } from './framework';

export interface BasicStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  thisWeek: number;
  lastWeek: number;
  averageCharacters: number;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalActiveDays: number;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changeRate: number;
}

export interface FrameworkDistribution {
  frameworkId: string;
  name: string;
  displayName: string;
  color: string;
  count: number;
  percentage: number;
}

export interface TrendPoint {
  period: string;
  count: number;
  characters: number;
}

export interface AnalyticsSummary {
  basicStats: BasicStats;
  streak: StreakStats;
  monthComparison: PeriodComparison;
  weekComparison: PeriodComparison;
  growthScore: number;
}

export interface AnalyticsTrends {
  weekly: TrendPoint[];
  monthly: TrendPoint[];
}

export interface AnalyticsDistribution {
  frameworks: FrameworkDistribution[];
}

export interface AnalyticsInput {
  reflections: Reflection[];
  frameworks: Framework[];
  now?: Date;
}
