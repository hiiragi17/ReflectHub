'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AnalyticsSummary,
  AnalyticsTrends,
  AnalyticsDistribution,
} from '@/types/analytics';

const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface StatisticsCache {
  summary?: CacheEntry<AnalyticsSummary>;
  trends?: CacheEntry<AnalyticsTrends>;
  distribution?: CacheEntry<AnalyticsDistribution>;
}

const cacheByUser: Record<string, StatisticsCache> = {};

const getCache = (userId: string): StatisticsCache => {
  if (!cacheByUser[userId]) {
    cacheByUser[userId] = {};
  }
  return cacheByUser[userId];
};

const isFresh = (entry: CacheEntry<unknown> | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`リクエストに失敗しました (${response.status})`);
  }
  return (await response.json()) as T;
}

export interface UseStatisticsState {
  summary: AnalyticsSummary | null;
  trends: AnalyticsTrends | null;
  distribution: AnalyticsDistribution | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface StatisticsData {
  summary: AnalyticsSummary;
  trends: AnalyticsTrends;
  distribution: AnalyticsDistribution;
}

/** キャッシュが新しければそれを使い、古ければ API から取り直してキャッシュを更新する。 */
async function fetchStatistics(userId: string, force: boolean): Promise<StatisticsData> {
  const cache = getCache(userId);

  const summaryPromise = force || !isFresh(cache.summary)
    ? fetchJson<{ summary: AnalyticsSummary }>('/api/analytics/summary').then(
        (res) => res.summary,
      )
    : Promise.resolve(cache.summary!.data);

  const trendsPromise = force || !isFresh(cache.trends)
    ? fetchJson<{ trends: AnalyticsTrends }>('/api/analytics/trends').then(
        (res) => res.trends,
      )
    : Promise.resolve(cache.trends!.data);

  const distributionPromise = force || !isFresh(cache.distribution)
    ? fetchJson<{ distribution: AnalyticsDistribution }>(
        '/api/analytics/distribution',
      ).then((res) => res.distribution)
    : Promise.resolve(cache.distribution!.data);

  const [summary, trends, distribution] = await Promise.all([
    summaryPromise,
    trendsPromise,
    distributionPromise,
  ]);

  cache.summary = { data: summary, timestamp: Date.now() };
  cache.trends = { data: trends, timestamp: Date.now() };
  cache.distribution = { data: distribution, timestamp: Date.now() };

  return { summary, trends, distribution };
}

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : '統計データの取得に失敗しました';

export const useStatistics = (userId: string | null | undefined): UseStatisticsState => {
  // 直近に取得できたデータと、それがどのユーザーのものか
  const [result, setResult] = useState<(StatisticsData & { userId: string }) | null>(null);
  // どのユーザーの初回取得まで終わったか(成功・失敗とも)。isLoading の判定に使う
  const [settledUserId, setSettledUserId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ userId: string; message: string } | null>(
    null,
  );
  const [isRefetching, setIsRefetching] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchStatistics(userId, false)
      .then((data) => {
        if (cancelled) return;
        setResult({ userId, ...data });
        setErrorState(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorState({ userId, message: toErrorMessage(err) });
      })
      .finally(() => {
        if (!cancelled) setSettledUserId(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setIsRefetching(true);
    setErrorState(null);
    try {
      const data = await fetchStatistics(userId, true);
      setResult({ userId, ...data });
    } catch (err) {
      setErrorState({ userId, message: toErrorMessage(err) });
    } finally {
      setIsRefetching(false);
    }
  }, [userId]);

  // 取得が終わるまでは、そのユーザーのキャッシュ(あれば)を表示する
  const cached = userId ? cacheByUser[userId] : undefined;
  const current = result && result.userId === userId ? result : null;

  const isLoading = Boolean(userId) && (isRefetching || settledUserId !== userId);
  const error =
    !isLoading && errorState && errorState.userId === userId ? errorState.message : null;

  return {
    summary: current?.summary ?? cached?.summary?.data ?? null,
    trends: current?.trends ?? cached?.trends?.data ?? null,
    distribution: current?.distribution ?? cached?.distribution?.data ?? null,
    isLoading,
    error,
    refetch,
  };
};
