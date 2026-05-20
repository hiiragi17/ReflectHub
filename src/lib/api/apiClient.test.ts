import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, _resetCSRFCacheForTest } from './apiClient';

describe('apiFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetCSRFCacheForTest();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function csrfResponse(token: string) {
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('does not attach CSRF header for GET', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    await apiFetch('/api/foo', { method: 'GET' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers ?? undefined);
    expect(headers.get('X-CSRF-Token')).toBeNull();
  });

  it('attaches CSRF header on POST and fetches token first time', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfResponse('abc.def'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await apiFetch('/api/foo', { method: 'POST', body: '{}' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/csrf');
    const postInit = fetchMock.mock.calls[1][1] as RequestInit;
    const headers = new Headers(postInit.headers ?? undefined);
    expect(headers.get('X-CSRF-Token')).toBe('abc.def');
  });

  it('reuses cached token on subsequent calls', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfResponse('cached.tok'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await apiFetch('/api/a', { method: 'POST' });
    await apiFetch('/api/b', { method: 'POST' });

    // 1 csrf fetch + 2 actual calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/csrf');
  });

  it('refreshes token on 403 and retries once', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfResponse('stale.tok'))
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(csrfResponse('fresh.tok'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const res = await apiFetch('/api/foo', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryInit = fetchMock.mock.calls[3][1] as RequestInit;
    const headers = new Headers(retryInit.headers ?? undefined);
    expect(headers.get('X-CSRF-Token')).toBe('fresh.tok');
  });
});
