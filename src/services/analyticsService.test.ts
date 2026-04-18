import { describe, it, expect } from 'vitest';
import {
  calculateBasicStats,
  calculateStreak,
  calculateFrameworkDistribution,
  calculateTrends,
  calculateGrowthScore,
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

  describe('calculateGrowthScore', () => {
    it('returns 0 for empty data', () => {
      expect(calculateGrowthScore([], FRAMEWORKS, now)).toBe(0);
    });

    it('returns a value between 0 and 100', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18', framework_id: 'ywt' }),
        buildReflection({ id: '2', reflection_date: '2026-04-17', framework_id: 'kpt' }),
      ];
      const score = calculateGrowthScore(reflections, FRAMEWORKS, now);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('scores higher for more active users', () => {
      const low = [buildReflection({ id: '1', reflection_date: '2026-04-18' })];
      const high: Reflection[] = [];
      for (let i = 0; i < 20; i++) {
        const d = new Date(2026, 3, 18 - i);
        high.push(
          buildReflection({
            id: `h-${i}`,
            reflection_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            framework_id: i % 2 === 0 ? 'ywt' : 'kpt',
            content: { a: 'a'.repeat(600) },
          }),
        );
      }
      const lowScore = calculateGrowthScore(low, FRAMEWORKS, now);
      const highScore = calculateGrowthScore(high, FRAMEWORKS, now);
      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('getSummary / getTrends / getDistribution', () => {
    it('returns aggregated results', () => {
      const reflections = [
        buildReflection({ id: '1', reflection_date: '2026-04-18', framework_id: 'ywt' }),
        buildReflection({ id: '2', reflection_date: '2026-03-18', framework_id: 'kpt' }),
      ];

      const summary = getSummary(reflections, FRAMEWORKS, now);
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
