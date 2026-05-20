/**
 * クライアント (ブラウザ) から自前 API を呼ぶための薄いラッパー。
 *
 * - mutation メソッド (POST/PUT/PATCH/DELETE) のときは `/api/csrf` から取得した
 *   トークンを `X-CSRF-Token` ヘッダに自動付与する。
 * - 取得したトークンはモジュールスコープにキャッシュし、403 が返ったときだけ
 *   再取得する (Cookie とトークンが期限切れだった場合のリトライ)。
 *
 * React のフック (`useCSRFToken`) はコンポーネント内で使えるが、Zustand store や
 * シングルトンクラスからは呼べないため本ヘルパーを使う。
 */

const CSRF_ENDPOINT = '/api/csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(CSRF_ENDPOINT, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      cachedToken = data.token ?? null;
      return cachedToken;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function getToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedToken) return cachedToken;
  return fetchToken();
}

function isMutating(method: string | undefined): boolean {
  return MUTATING_METHODS.has((method ?? 'GET').toUpperCase());
}

async function applyCSRFHeader(init: RequestInit, forceRefresh = false): Promise<RequestInit> {
  if (!isMutating(init.method)) return init;
  const token = await getToken(forceRefresh);
  if (!token) return init;
  const headers = new Headers(init.headers ?? undefined);
  headers.set(CSRF_HEADER, token);
  return { ...init, headers };
}

/**
 * 自動的に CSRF トークンを付与する fetch。
 * 同一オリジンの自前 API を呼ぶ用途を想定。
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const initWithCsrf = await applyCSRFHeader({ credentials: 'same-origin', ...init });
  const res = await fetch(input, initWithCsrf);

  // 403 (CSRF 失敗の可能性) の場合は 1 度だけトークンを再取得してリトライする。
  if (res.status === 403 && isMutating(init.method)) {
    const retryInit = await applyCSRFHeader({ credentials: 'same-origin', ...init }, true);
    return fetch(input, retryInit);
  }
  return res;
}

/** テスト用: モジュール内のキャッシュを破棄する。 */
export function _resetCSRFCacheForTest(): void {
  cachedToken = null;
  inflight = null;
}
