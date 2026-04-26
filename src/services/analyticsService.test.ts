import { describe, it, expect } from 'vitest';
import {
  calculateBasicStats,
  calculateStreak,
  calculateWeeklyStreak,
  buildWeeklyHeatmap,
  calculateFrameworkDistribution,
  calculateTrends,
  getSummary,
  getTrends,
  getDistribution,
} from './analyticsService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

const FRAMEWORKS: Framework[] = [
  {
    id: 'ywt',
    name: 'ywt',
    display_name: 'YWT',
    schema: [],
    is_active: true,
    sort_order: 1,
    color: '#3b82f6',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'kpt',
    name: 'kpt',
    display_name: 'KPT',
    schema: [],
    is_active: true,
    sort_order: 2,
    color: '#10b981',
    created_at: '',
    updated_at: '',
  },
];

const buildReflection = (overrides: Partial<Reflection>): Reflection => ({
  id: overrides.id || 'ref',
  user_id: 'user-1',
  framework_id: overrides.framework_id || 'ywt',
  content: overrides.content || { a: 'hello', b: 'world' },
  reflection_date: overrides.reflection_date || '2026-04-18',
  created_at: '2026-04-18T00:00:00Z',
  updated_at: '2026-04-18T00:00:00Z',
  ...overrides,
});

describe('analyticsService', () => {
  const now = new Date(2026, 3, 18); // 2026-04-18 (Saturday)

  describe('calculateBasicStats', () => {
    it('returns zero stats for empty data', () => {
      const result = calculateBasicStats([], now);
      expect(result).toEqual({
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        thisWeek: 0,
        lastWeek: 0,
        averageCharacters: 0,
      });
    });

    it('counts total, monthly, weekly, and averages characters', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18', content: { a: 'a'.repeat(100) } }),
        buildReflection({ id: '2', reflection_date: '2026-04-14', content: { a: 'a'.repeat(200) } }),
        buildReflection({ id: '3', reflection_date: '2026-04-01', content: { a: 'a'.repeat(300) } }),
        buildReflection({ id: '4', reflection_date: '2026-03-20', content: { a: 'a'.repeat(400) } }),
        buildReflection({ id: '5', reflection_date: '2026-04-10', content: { a: 'a'.repeat(50) } }),
      ];

      const stats = calculateBasicStats(reflections, now);

      expect(stats.total).toBe(5);
      expect(stats.thisMonth).toBe(4); // April entries
      expect(stats.lastMonth).toBe(1); // March entry
      // Current week (Mon 2026-04-13 ~ Sun 2026-04-19): 04-14, 04-18
      expect(stats.thisWeek).toBe(2);
      // Previous week (Mon 2026-04-06 ~ Sun 2026-04-12): 04-10
      expect(stats.lastWeek).toBe(1);
      expect(stats.averageCharacters).toBe(210); // (100+200+300+400+50)/5
    });
  });

  describe('calculateStreak', () => {
    it('returns zero for no reflections', () => {
      const result = calculateStreak([], now);
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0, totalActiveDays: 0 });
    });

    it('computes current streak ending today', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-16' }),
        buildReflection({ id: '2', reflection_date: '2026-04-17' }),
        buildReflection({ id: '3', reflection_date: '2026-04-18' }),
      ];
      const result = calculateStreak(reflections, now);
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
      expect(result.totalActiveDays).toBe(3);
    });

    it('allows streak that ended yesterday', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-16' }),
        buildReflection({ id: '2', reflection_date: '2026-04-17' }),
      ];
      const result = calculateStreak(reflections, now);
      expect(result.currentStreak).toBe(2);
    });

    it('returns 0 when the latest reflection is older than yesterday', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-10' }),
        buildReflection({ id: '2', reflection_date: '2026-04-11' }),
      ];
      const result = calculateStreak(reflections, now);
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(2);
    });

    it('tracks best streak across gaps', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-01' }),
        buildReflection({ id: '2', reflection_date: '2026-04-02' }),
        buildReflection({ id: '3', reflection_date: '2026-04-03' }),
        buildReflection({ id: '4', reflection_date: '2026-04-04' }),
        buildReflection({ id: '5', reflection_date: '2026-04-10' }),
      ];
      const result = calculateStreak(reflections, now);
      expect(result.bestStreak).toBe(4);
      expect(result.totalActiveDays).toBe(5);
    });

    it('deduplicates same-day reflections for active days', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18' }),
        buildReflection({ id: '2', reflection_date: '2026-04-18' }),
      ];
      const result = calculateStreak(reflections, now);
      expect(result.totalActiveDays).toBe(1);
      expect(result.currentStreak).toBe(1);
    });
  });

  describe('calculateWeeklyStreak', () => {
    it('returns zero for empty data', () => {
      expect(calculateWeeklyStreak([], now)).toEqual({
        currentStreak: 0,
        bestStreak: 0,
        totalActiveWeeks: 0,
      });
    });

    it('counts a single week as a 1-week streak', () => {
      // Current week (Mon 2026-04-13 ~ Sun 2026-04-19)
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18' }),
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result).toEqual({
        currentStreak: 1,
        bestStreak: 1,
        totalActiveWeeks: 1,
      });
    });

    it('groups multiple reflections in the same week as one active week', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-13' }), // Mon
        buildReflection({ id: '2', reflection_date: '2026-04-14' }), // Tue
        buildReflection({ id: '3', reflection_date: '2026-04-19' }), // Sun
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result.totalActiveWeeks).toBe(1);
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
    });

    it('counts consecutive weeks ending in current week', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-01' }), // week of 03-30
        buildReflection({ id: '2', reflection_date: '2026-04-08' }), // week of 04-06
        buildReflection({ id: '3', reflection_date: '2026-04-15' }), // week of 04-13 (current)
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
      expect(result.totalActiveWeeks).toBe(3);
    });

    it('allows current streak that ended last week', () => {
      // No reflection in current week (Mon 2026-04-13 ~), but two prior weeks active
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-03-30' }), // week of 03-30
        buildReflection({ id: '2', reflection_date: '2026-04-06' }), // week of 04-06 (last week)
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result.currentStreak).toBe(2);
      expect(result.bestStreak).toBe(2);
    });

    it('returns zero current streak when latest week is older than last week', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-03-23' }), // 3 weeks ago
        buildReflection({ id: '2', reflection_date: '2026-03-30' }), // 2 weeks ago
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(2);
      expect(result.totalActiveWeeks).toBe(2);
    });

    it('tracks best streak across gaps', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-01-05' }),
        buildReflection({ id: '2', reflection_date: '2026-01-12' }),
        buildReflection({ id: '3', reflection_date: '2026-01-19' }),
        buildReflection({ id: '4', reflection_date: '2026-01-26' }),
        buildReflection({ id: '5', reflection_date: '2026-04-15' }), // gap, then current week
      ];
      const result = calculateWeeklyStreak(reflections, now);
      expect(result.bestStreak).toBe(4);
      expect(result.currentStreak).toBe(1);
      expect(result.totalActiveWeeks).toBe(5);
    });
  });

  describe('buildWeeklyHeatmap', () => {
    it('returns the requested number of weekly buckets in chronological order', () => {
      const result = buildWeeklyHeatmap([], 12, now);
      expect(result).toHaveLength(12);
      // Last bucket = current week start (Mon 2026-04-13)
      expect(result[result.length - 1].weekStart).toBe('2026-04-13');
      // First bucket = 11 weeks earlier
      expect(result[0].weekStart).toBe('2026-01-26');
      // Sorted ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i].weekStart > result[i - 1].weekStart).toBe(true);
      }
    });

    it('counts reflections within each weekly bucket', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-13' }),
        buildReflection({ id: '2', reflection_date: '2026-04-14' }),
        buildReflection({ id: '3', reflection_date: '2026-04-06' }),
      ];
      const result = buildWeeklyHeatmap(reflections, 4, now);
      expect(result).toHaveLength(4);
      const current = result[result.length - 1];
      const last = result[result.length - 2];
      expect(current.weekStart).toBe('2026-04-13');
      expect(current.count).toBe(2);
      expect(last.weekStart).toBe('2026-04-06');
      expect(last.count).toBe(1);
    });

    it('ignores reflections outside the window', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2024-01-01' }),
      ];
      const result = buildWeeklyHeatmap(reflections, 4, now);
      const total = result.reduce((s, c) => s + c.count, 0);
      expect(total).toBe(0);
    });
  });

  describe('calculateFrameworkDistribution', () => {
    it('groups and sorts by count descending', () => {
      const reflections = [
        buildReflection({ id: '1', framework_id: 'ywt' }),
        buildReflection({ id: '2', framework_id: 'kpt' }),
        buildReflection({ id: '3', framework_id: 'ywt' }),
        buildReflection({ id: '4', framework_id: 'ywt' }),
      ];
      const result = calculateFrameworkDistribution(reflections, FRAMEWORKS);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ frameworkId: 'ywt', count: 3, percentage: 75 });
      expect(result[1]).toMatchObject({ frameworkId: 'kpt', count: 1, percentage: 25 });
    });

    it('handles unknown framework ids gracefully', () => {
      const reflections = [buildReflection({ framework_id: 'gone' })];
      const result = calculateFrameworkDistribution(reflections, FRAMEWORKS);
      expect(result[0]).toMatchObject({
        frameworkId: 'gone',
        displayName: '不明なフレームワーク',
        color: '#6B7280',
      });
    });

    it('returns empty array for no reflections', () => {
      expect(calculateFrameworkDistribution([], FRAMEWORKS)).toEqual([]);
    });
  });

  describe('calculateTrends', () => {
    it('creates weekly and monthly buckets', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18', content: { a: 'hello' } }),
        buildReflection({ id: '2', reflection_date: '2026-04-14', content: { a: 'world' } }),
      ];
      const result = calculateTrends(reflections, now, { weeks: 4, months: 3 });

      expect(result.weekly).toHaveLength(4);
      expect(result.monthly).toHaveLength(3);

      // Last weekly bucket = current week, should have 2 entries
      const lastWeek = result.weekly[result.weekly.length - 1];
      expect(lastWeek.count).toBe(2);
      expect(lastWeek.characters).toBe(10);

      // Last month = 2026-04, should have 2 entries
      const lastMonth = result.monthly[result.monthly.length - 1];
      expect(lastMonth.period).toBe('2026-04');
      expect(lastMonth.count).toBe(2);
    });

    it('ignores reflections outside the bucket window', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2024-01-01' }),
      ];
      const result = calculateTrends(reflections, now, { weeks: 4, months: 3 });
      const totalWeekly = result.weekly.reduce((s, p) => s + p.count, 0);
      const totalMonthly = result.monthly.reduce((s, p) => s + p.count, 0);
      expect(totalWeekly).toBe(0);
      expect(totalMonthly).toBe(0);
    });
  });

  describe('getSummary / getTrends / getDistribution', () => {
    it('returns aggregated results', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18', framework_id: 'ywt' }),
        buildReflection({ id: '2', reflection_date: '2026-03-18', framework_id: 'kpt' }),
      ];

      const summary = getSummary(reflections, now);
      expect(summary.basicStats.total).toBe(2);
      expect(summary.monthComparison.current).toBe(1);
      expect(summary.monthComparison.previous).toBe(1);
      expect(summary.monthComparison.change).toBe(0);

      const trends = getTrends(reflections, now);
      expect(trends.weekly.length).toBeGreaterThan(0);
      expect(trends.monthly.length).toBeGreaterThan(0);

      const distribution = getDistribution(reflections, FRAMEWORKS);
      expect(distribution.frameworks).toHaveLength(2);
    });
  });
});
