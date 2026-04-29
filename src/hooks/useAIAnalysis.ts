'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analysis, AnalysisError, AnalysisResponse } from '@/types/analysis';

interface RateLimitState {
  remaining: number;
  limit: number;
  reset_at: string;
}

export interface UseAIAnalysisState {
  analysis: Analysis | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: AnalysisError | null;
  rateLimit: RateLimitState | null;
  analyze: () => Promise<void>;
}

async function parseError(response: Response): Promise<AnalysisError> {
  try {
    const json = (await response.json()) as { error?: AnalysisError };
    if (json?.error) return json.error;
  } catch {
    // ignore
  }
  return {
    code: 'INTERNAL_ERROR',
    message: `リクエストに失敗しました (${response.status})`,
  };
}

export function useAIAnalysis(reflectionId: string | null | undefined): UseAIAnalysisState {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(reflectionId));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchExisting = useCallback(async () => {
    if (!reflectionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ai/analyze?reflection_id=${encodeURIComponent(reflectionId)}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        if (!mountedRef.current) return;
        setError(await parseError(response));
        return;
      }
      const json = (await response.json()) as { analysis: Analysis | null };
      if (!mountedRef.current) return;
      setAnalysis(json.analysis);
    } catch (err) {
      if (!mountedRef.current) return;
      setError({
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : '分析結果の取得に失敗しました',
      });
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [reflectionId]);

  useEffect(() => {
    // reflectionId が切り替わったら、前の振り返りの分析・残数・エラーを必ずクリアする。
    // そうしないとフェッチ完了前や失敗時に他の振り返りの結果が表示されてしまう。
    setAnalysis(null);
    setRateLimit(null);
    setError(null);
    if (reflectionId) {
      void fetchExisting();
    } else {
      setIsLoading(false);
    }
  }, [reflectionId, fetchExisting]);

  const analyze = useCallback(async () => {
    if (!reflectionId || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reflection_id: reflectionId }),
      });

      if (!response.ok) {
        // parseError が body を消費するため、429 用に先にクローンしておく。
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

      const json = (await response.json()) as AnalysisResponse;
      if (!mountedRef.current) return;
      setAnalysis(json.analysis);
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
  }, [reflectionId, isAnalyzing]);

  return { analysis, isLoading, isAnalyzing, error, rateLimit, analyze };
}
