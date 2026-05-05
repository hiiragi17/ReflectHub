'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * CSRF トークンを取得するフック。
 *
 * 初回レンダリング時にサーバから double-submit Cookie + トークンを受け取り、
 * 状態変更系リクエスト (POST/PUT/PATCH/DELETE) のヘッダ X-CSRF-Token に付与するために使う。
 */

const CSRF_ENDPOINT = '/api/csrf';

interface CSRFTokenState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useCSRFToken() {
  const [state, setState] = useState<CSRFTokenState>({
    token: null,
    loading: true,
    error: null,
  });
  const fetchedRef = useRef(false);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(CSRF_ENDPOINT, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`CSRF token request failed: ${res.status}`);
      }
      const data = (await res.json()) as { token?: string };
      const token = data.token ?? null;
      setState({ token, loading: false, error: null });
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CSRF トークンの取得に失敗しました。';
      setState({ token: null, loading: false, error: message });
      return null;
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchToken();
  }, [fetchToken]);

  const withCSRFHeader = useCallback(
    (headers: HeadersInit = {}): HeadersInit => {
      if (!state.token) return headers;
      const merged = new Headers(headers);
      merged.set('X-CSRF-Token', state.token);
      return merged;
    },
    [state.token],
  );

  return {
    token: state.token,
    loading: state.loading,
    error: state.error,
    refresh: fetchToken,
    withCSRFHeader,
  };
}
