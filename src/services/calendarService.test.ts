import { describe, it, expect, beforeEach } from 'vitest';
import {
  transformToMonthlyCalendar,
  filterReflectionsByDateRange,
  getMonthCalendarData,
  getCurrentMonthStats,
} from './calendarService';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

// Test data
const mockFrameworks: Framework[] = [
  {
    id: 'fw-1',
    name: 'four-ks',
    display_name: 'Keep, Stop, Start, More of',
    description: null,
    schema: [],
    icon: '🔄',
    color: '#3b82f6',
    is_active: true,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fw-2',
    name: 'smart-goals',
    display_name: 'SMART Goals',
    description: null,
    schema: [],
    icon: '🎯',
    color: '#ef4444',
    is_active: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const createMockReflection = (
  id: string,
  frameworkId: string,
  reflectionDate: string
): Reflection => ({
  id,
  user_id: 'user-123',
  framework_id: frameworkId,
  content: { field1: 'test' },
  reflection_date: reflectionDate,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

describe('calendarService', () => {
  describe('transformToMonthlyCalendar', () => {
    it('should return calendar data for a given month', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
        createMockReflection('r-2', 'fw-2', '2024-11-15'),
      ];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);

      expect(calendar.year).toBe(2024);
      expect(calendar.month).toBe(11);
      expect(calendar.days.length).toBeGreaterThan(0);
      expect(calendar.monthlyStats).toBeDefined();
    });

    it('should group reflections by date correctly', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-05'),
        createMockReflection('r-2', 'fw-1', '2024-11-05'),
        createMockReflection('r-3', 'fw-2', '2024-11-10'),
      ];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);

      const day5 = calendar.days.find((d) => d.date === '2024-11-05');
      const day10 = calendar.days.find((d) => d.date === '2024-11-10');

      expect(day5?.count).toBe(2);
      expect(day10?.count).toBe(1);
    });

    it('should include dates outside the target month', () => {
      const reflections: Reflection[] = [];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);

      // November 1, 2024 is a Friday
      // Calendar should include days from previous month
      const hasEarlyDates = calendar.days.some((d) => d.dateObject.getMonth() === 9); // October

      // November typically has 30 days, but calendar view includes padding
      expect(calendar.days.length).toBeGreaterThanOrEqual(35);
    });

    it('should calculate correct framework breakdown', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
        createMockReflection('r-2', 'fw-1', '2024-11-02'),
        createMockReflection('r-3', 'fw-2', '2024-11-03'),
      ];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);
      const stats = calendar.monthlyStats;

      expect(stats.frameworkBreakdown['fw-1'].count).toBe(2);
      expect(stats.frameworkBreakdown['fw-2'].count).toBe(1);
    });

    it('should calculate consecutive days correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(yesterday);
      dayBefore.setDate(dayBefore.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];

      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', todayStr),
        createMockReflection('r-2', 'fw-1', yesterdayStr),
        createMockReflection('r-3', 'fw-1', dayBeforeStr),
      ];

      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const calendar = transformToMonthlyCalendar(
        currentYear,
        currentMonth,
        reflections,
        mockFrameworks
      );

      expect(calendar.monthlyStats.consecutiveDays).toBe(3);
    });

    it('should calculate total and unique date count', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
        createMockReflection('r-2', 'fw-1', '2024-11-01'),
        createMockReflection('r-3', 'fw-2', '2024-11-02'),
        createMockReflection('r-4', 'fw-2', '2024-11-02'),
        createMockReflection('r-5', 'fw-2', '2024-11-02'),
      ];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);
      const stats = calendar.monthlyStats;

      expect(stats.totalReflections).toBe(5);
      expect(stats.uniqueDates).toBe(2);
      expect(stats.averagePerDay).toBe(2.5);
    });

    it('should calculate weekly statistics', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-04'),
        createMockReflection('r-2', 'fw-1', '2024-11-11'),
        createMockReflection('r-3', 'fw-2', '2024-11-18'),
      ];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);

      expect(calendar.weeklyStats.length).toBeGreaterThan(0);
      // Each week should have reflection count
      const weeksWithReflections = calendar.weeklyStats.filter(
        (w) => w.reflectionCount > 0
      );
      expect(weeksWithReflections.length).toBe(3);
    });

    it('should handle empty reflections', () => {
      const reflections: Reflection[] = [];

      const calendar = transformToMonthlyCalendar(2024, 11, reflections, mockFrameworks);

      expect(calendar.monthlyStats.totalReflections).toBe(0);
      expect(calendar.monthlyStats.uniqueDates).toBe(0);
      expect(calendar.monthlyStats.averagePerDay).toBe(0);
    });
  });

  describe('filterReflectionsByDateRange', () => {
    it('should filter reflections within date range', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
        createMockReflection('r-2', 'fw-1', '2024-11-15'),
        createMockReflection('r-3', 'fw-2', '2024-12-01'),
      ];

      const startDate = new Date(2024, 10, 1); // Nov 1
      const endDate = new Date(2024, 10, 30); // Nov 30

      const filtered = filterReflectionsByDateRange(reflections, startDate, endDate);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.reflection_date.startsWith('2024-11'))).toBe(
        true
      );
    });

    it('should include boundary dates', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
        createMockReflection('r-2', 'fw-1', '2024-11-30'),
      ];

      const startDate = new Date(2024, 10, 1);
      const endDate = new Date(2024, 10, 30);

      const filtered = filterReflectionsByDateRange(reflections, startDate, endDate);

      expect(filtered).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-01'),
      ];

      const startDate = new Date(2024, 11, 1); // Dec 1
      const endDate = new Date(2024, 11, 31); // Dec 31

      const filtered = filterReflectionsByDateRange(reflections, startDate, endDate);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getMonthCalendarData', () => {
    it('should return calendar data for specific month and year', () => {
      const reflections: Reflection[] = [
        createMockReflection('r-1', 'fw-1', '2024-11-15'),
      ];

      const calendar = getMonthCalendarData(2024, 11, reflections, mockFrameworks);

      expect(calendar.year).toBe(2024);
      expect(calendar.month).toBe(11);
      expect(calendar.monthlyStats.totalReflections).toBe(1);
    });
  });

  describe('getCurrentMonthStats', () => {
    it('should calculate stats for current month', () => {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const todayStr = today.toISOString().split('T')[0];

      const reflectionsByDate = new Map<string, Reflection[]>();
      reflectionsByDate.set(todayStr, [
        createMockReflection('r-1', 'fw-1', todayStr),
      ]);

      const stats = getCurrentMonthStats(reflectionsByDate, mockFrameworks);

      expect(stats.totalReflections).toBe(1);
      expect(stats.uniqueDates).toBe(1);
    });

    it('should only include current month reflections', () => {
      const reflectionsByDate = new Map<string, Reflection[]>();
      // Add reflection from previous month
      reflectionsByDate.set('2024-10-01', [
        createMockReflection('r-1', 'fw-1', '2024-10-01'),
      ]);

      const stats = getCurrentMonthStats(reflectionsByDate, mockFrameworks);

      // Should not count reflections from other months
      expect(stats.totalReflections).toBe(0);
    });

    it('should include framework breakdown with colors', () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const reflectionsByDate = new Map<string, Reflection[]>();
      reflectionsByDate.set(todayStr, [
        createMockReflection('r-1', 'fw-1', todayStr),
        createMockReflection('r-2', 'fw-2', todayStr),
      ]);

      const stats = getCurrentMonthStats(reflectionsByDate, mockFrameworks);

      expect(stats.frameworkBreakdown['fw-1'].color).toBe('#3b82f6');
      expect(stats.frameworkBreakdown['fw-2'].color).toBe('#ef4444');
    });
  });
});
