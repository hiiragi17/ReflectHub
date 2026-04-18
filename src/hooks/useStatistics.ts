'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const cache: StatisticsCache = {};

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

export const useStatistics = (): UseStatisticsState => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(
    cache.summary?.data ?? null,
  );
  const [trends, setTrends] = useState<AnalyticsTrends | null>(
    cache.trends?.data ?? null,
  );
  const [distribution, setDistribution] = useState<AnalyticsDistribution | null>(
    cache.distribution?.data ?? null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
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

      const [summaryData, trendsData, distributionData] = await Promise.all([
        summaryPromise,
        trendsPromise,
        distributionPromise,
      ]);

      cache.summary = { data: summaryData, timestamp: Date.now() };
      cache.trends = { data: trendsData, timestamp: Date.now() };
      cache.distribution = { data: distributionData, timestamp: Date.now() };

      if (!mountedRef.current) return;
      setSummary(summaryData);
      setTrends(trendsData);
      setDistribution(distributionData);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : '統計データの取得に失敗しました');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load(false);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return {
    summary,
    trends,
    distribution,
    isLoading,
    error,
    refetch: () => load(true),
  };
};
