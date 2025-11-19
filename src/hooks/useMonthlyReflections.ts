'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MonthlyCalendarData, CalendarWithFrameworks } from '@/types/calendar';
import type { Framework } from '@/types/framework';
import type { Reflection } from '@/types/reflection';
import { getUserReflections } from '@/services/reflectionService';
import { frameworkService } from '@/services/frameworkService';
import { getMonthCalendarData } from '@/services/calendarService';
import { supabase } from '@/lib/supabase/client';

interface UseMonthlyReflectionsOptions {
  year?: number;
  month?: number;
  timeZone?: string;
  limit?: number;
}

interface UseMonthlyReflectionsState {
  calendar: MonthlyCalendarData | null;
  frameworks: Framework[];
  reflections: Reflection[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and transforming monthly reflection data
 * Combines reflection fetching with calendar data transformation
 *
 * @param options - Configuration options
 * @returns State object with calendar data, frameworks, and utilities
 *
 * @example
 * const { calendar, frameworks, isLoading, error } = useMonthlyReflections({
 *   year: 2024,
 *   month: 11,
 *   timeZone: 'Asia/Tokyo'
 * });
 */
export const useMonthlyReflections = (
  options: UseMonthlyReflectionsOptions = {}
): UseMonthlyReflectionsState => {
  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    timeZone = 'Asia/Tokyo',
    limit = 200,
  } = options;

  const [calendar, setCalendar] = useState<MonthlyCalendarData | null>(null);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        setUserId(user.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get user';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  // Fetch data when userId or month/year changes
  const fetchMonthlyData = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch reflections and frameworks in parallel
      const [reflectionsData, frameworksData] = await Promise.all([
        getUserReflections(userId, limit, timeZone),
        frameworkService.getFrameworks(),
      ]);

      setReflections(reflectionsData);
      setFrameworks(frameworksData);

      // Transform to calendar data
      const calendarData = getMonthCalendarData(
        year,
        month,
        reflectionsData,
        frameworksData
      );

      setCalendar(calendarData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch monthly reflections';
      setError(errorMessage);
      console.error('useMonthlyReflections error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, year, month, limit, timeZone]);

  // Initial fetch
  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  return {
    calendar,
    frameworks,
    reflections,
    isLoading,
    error,
    refetch: fetchMonthlyData,
  };
};

/**
 * Alternative hook for fetching with full calendar+frameworks data
 * Useful when you need both datasets together
 */
export const useMonthlyReflectionsWithFrameworks = (
  options: UseMonthlyReflectionsOptions = {}
): UseMonthlyReflectionsState & { data: CalendarWithFrameworks | null } => {
  const state = useMonthlyReflections(options);

  const data =
    state.calendar && state.frameworks
      ? {
          calendar: state.calendar,
          frameworks: state.frameworks,
        }
      : null;

  return {
    ...state,
    data,
  };
};
