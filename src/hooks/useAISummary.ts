'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Summary, SummaryError, SummaryPeriod, SummaryResponse } from '@/types/summary';

interface RateLimitState {
  remaining: number;
  limit: number;
  reset_at: string;
}

export interface UseAISummaryState {
  summary: Summary | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: SummaryError | null;
  rateLimit: RateLimitState | null;
  period: SummaryPeriod;
  setPeriod: (period: SummaryPeriod) => void;
  analyze: () => Promise<void>;
}

async function parseError(response: Response): Promise<SummaryError> {
  try {
    const json = (await response.json()) as { error?: SummaryError };
    if (json?.error) return json.error;
  } catch {
    // ignore
  }
  return {
    code: 'INTERNAL_ERROR',
    message: `リクエストに失敗しました (${response.status})`,
  };
}

export function useAISummary(initialPeriod: SummaryPeriod = 'week'): UseAISummaryState {
  const [period, setPeriodState] = useState<SummaryPeriod>(initialPeriod);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<SummaryError | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const mountedRef = useRef(true);
  // fetchExisting は period 切替で連続発火するため、最後に開始したリクエスト ID
  // と一致するレスポンスのみ state に反映する。先に始まった古い period の
  // レスポンスが後から返ってきて現在の tab を上書きするのを防ぐ。
  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchExisting = useCallback(async (target: SummaryPeriod) => {
    const fetchId = ++latestFetchIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ai/summary?period=${encodeURIComponent(target)}`,
        { credentials: 'include' },
      );
      if (fetchId !== latestFetchIdRef.current) return;
      if (!response.ok) {
        if (!mountedRef.current) return;
        setError(await parseError(response));
        return;
      }
      const json = (await response.json()) as { summary: Summary | null };
      if (!mountedRef.current || fetchId !== latestFetchIdRef.current) return;
      setSummary(json.summary);
    } catch (err) {
      if (!mountedRef.current || fetchId !== latestFetchIdRef.current) return;
      setError({
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : '分析結果の取得に失敗しました',
      });
    } finally {
      if (mountedRef.current && fetchId === latestFetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setSummary(null);
    setRateLimit(null);
    setError(null);
    void fetchExisting(period);
  }, [period, fetchExisting]);

  const setPeriod = useCallback((next: SummaryPeriod) => {
    setPeriodState(next);
  }, []);

  const analyze = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ period }),
      });

      if (!response.ok) {
        const rateLimitClone = response.status === 429 ? response.clone() : null;
        const err = await parseError(response);
        if (rateLimitClone) {
          try {
            const json = (await rateLimitClone.json()) as {
              rate_limit?: RateLimitState;
            };
            if (json?.rate_limit && mountedRef.current) {
              setRateLimit(json.rate_limit);
            }
          } catch {
            // ignore
          }
        }
        if (mountedRef.current) setError(err);
        return;
      }

      const json = (await response.json()) as SummaryResponse;
      if (!mountedRef.current) return;
      setSummary(json.summary);
      setRateLimit(json.rate_limit);
    } catch (err) {
      if (!mountedRef.current) return;
      setError({
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : '分析の実行に失敗しました',
      });
    } finally {
      if (mountedRef.current) setIsAnalyzing(false);
    }
  }, [isAnalyzing, period]);

  return {
    summary,
    isLoading,
    isAnalyzing,
    error,
    rateLimit,
    period,
    setPeriod,
    analyze,
  };
}
