'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MonthlyCalendarData, CalendarWithFrameworks } from '@/types/calendar';
import type { Framework } from '@/types/framework';
import type { Reflection } from '@/types/reflection';
import { getUserReflections } from '@/services/reflectionService';
import { frameworkService } from '@/services/frameworkService';
import { getMonthCalendarData } from '@/services/calendarService';
import { useAuthStore } from '@/stores/authStore';

interface UseMonthlyReflectionsOptions {
  year?: number;
  month?: number;
  timeZone?: string;
  limit?: number;
}

interface MonthlyData {
  calendar: MonthlyCalendarData;
  frameworks: Framework[];
  reflections: Reflection[];
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

  // authStoreから最新のユーザー情報を取得（TOKEN_REFRESHEDで自動更新される）
  const { user } = useAuthStore();

  // 取得対象が変わったかを判定するキー。未ログインなら null
  const requestKey = user?.id
    ? `${user.id}:${year}:${month}:${limit}:${timeZone}`
    : null;

  // 直近に取得できたデータ(対象が変わっても、次の取得が終わるまでは前のデータを返す)
  const [data, setData] = useState<MonthlyData | null>(null);
  // どのキーまで取得が終わったか(成功・失敗とも)。isLoading の判定に使う
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const load = useCallback(
    async (userId: string): Promise<MonthlyData> => {
      // Fetch reflections and frameworks in parallel
      const [reflectionsData, frameworksData] = await Promise.all([
        getUserReflections(userId, limit, timeZone),
        frameworkService.getFrameworks(),
      ]);
      // Transform to calendar data
      const calendarData = getMonthCalendarData(year, month, reflectionsData, frameworksData);
      return { calendar: calendarData, frameworks: frameworksData, reflections: reflectionsData };
    },
    [year, month, limit, timeZone],
  );

  const toErrorMessage = (err: unknown): string => {
    console.error('useMonthlyReflections error:', err);
    return err instanceof Error ? err.message : 'Failed to fetch monthly reflections';
  };

  // Fetch data when user or month/year changes
  useEffect(() => {
    if (!user?.id || !requestKey) return;
    let cancelled = false;
    load(user.id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setFetchError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(toErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setSettledKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, requestKey, load]);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    setIsRefetching(true);
    setFetchError(null);
    try {
      setData(await load(user.id));
    } catch (err) {
      setFetchError(toErrorMessage(err));
    } finally {
      setIsRefetching(false);
    }
  }, [user?.id, load]);

  const isAuthenticated = requestKey !== null;
  const isLoading = isAuthenticated && (isRefetching || settledKey !== requestKey);
  const error = !isAuthenticated ? 'Not authenticated' : isLoading ? null : fetchError;

  return {
    calendar: data?.calendar ?? null,
    frameworks: data?.frameworks ?? [],
    reflections: data?.reflections ?? [],
    isLoading,
    error,
    refetch,
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
