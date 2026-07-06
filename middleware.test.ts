import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Supabase モック (CSRF 経路に到達できれば中身は問わない)。
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  })),
}));

import { generateCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/utils/csrfToken';
import { middleware } from './middleware';

const MUTATED_ENV_KEYS = [
  'CSRF_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;
const ORIGINAL_ENV: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of MUTATED_ENV_KEYS) ORIGINAL_ENV[k] = process.env[k];
  process.env.CSRF_SECRET = 'test-secret-for-middleware-1234567890';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

afterAll(() => {
  for (const k of MUTATED_ENV_KEYS) {
    if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL_ENV[k];
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(opts: {
  pathname: string;
  method: string;
  csrfHeader?: string;
  csrfCookie?: string;
}): NextRequest {
  const url = `http://localhost${opts.pathname}`;
  const headers = new Headers();
  if (opts.csrfHeader) headers.set(CSRF_HEADER_NAME, opts.csrfHeader);
  const req = new NextRequest(url, { method: opts.method, headers });
  if (opts.csrfCookie) {
    req.cookies.set(CSRF_COOKIE_NAME, opts.csrfCookie);
  }
  return req;
}

describe('middleware CSRF enforcement', () => {
  it('blocks POST /api/preferences without CSRF token (403)', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/preferences', method: 'POST' }),
    );
    expect(res.status).toBe(403);
  });

  it('blocks PUT with mismatched header/cookie (403)', async () => {
    const a = generateCSRFToken();
    const b = generateCSRFToken();
    const res = await middleware(
      makeRequest({
        pathname: '/api/preferences',
        method: 'PUT',
        csrfHeader: a,
        csrfCookie: b,
      }),
    );
    expect(res.status).toBe(403);
  });

  it('blocks DELETE with tampered signature (403)', async () => {
    const t = generateCSRFToken();
    const tampered = `${t.split('.')[0]}.deadbeef`;
    const res = await middleware(
      makeRequest({
        pathname: '/api/preferences',
        method: 'DELETE',
        csrfHeader: tampered,
        csrfCookie: tampered,
      }),
    );
    expect(res.status).toBe(403);
  });

  it('allows POST with matching valid CSRF token', async () => {
    const t = generateCSRFToken();
    const res = await middleware(
      makeRequest({
        pathname: '/api/preferences',
        method: 'POST',
        csrfHeader: t,
        csrfCookie: t,
      }),
    );
    // 200 系 or リダイレクト (NextResponse.next())。403 でない事を確認すれば十分。
    expect(res.status).not.toBe(403);
  });

  it('allows GET without CSRF token', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/preferences', method: 'GET' }),
    );
    expect(res.status).not.toBe(403);
  });

  it('exempts /api/csrf', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/csrf', method: 'POST' }),
    );
    expect(res.status).not.toBe(403);
  });

  it('exempts /api/auth/session (OAuth callback page POSTs here to set cookies)', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/auth/session', method: 'POST' }),
    );
    expect(res.status).not.toBe(403);
  });

  it('exempts /api/cron/*', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/cron/daily-reminder', method: 'POST' }),
    );
    expect(res.status).not.toBe(403);
  });

  it('does not enforce CSRF on non-API mutating requests (e.g. /something POST)', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/dashboard', method: 'POST' }),
    );
    expect(res.status).not.toBe(403);
  });
});

describe('middleware session-redirect exemptions', () => {
  // session 認証は route ハンドラ側で行うため、middleware で /auth に
  // リダイレクトしてはいけないパスを明示的に検証する。
  // 307 (Temporary Redirect) / 308 (Permanent Redirect) どちらでも fail。
  // 加えて POST 系は CSRF (403) や別の早期 return で通り抜けていないことを
  // 確認するため、status < 400 (= NextResponse.next() による 200) を assert する。
  const isRedirectStatus = (status: number) => status >= 300 && status < 400;

  it('does not redirect unauthenticated GET /api/cron/* to /auth', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/cron/daily-reminder', method: 'GET' }),
    );
    expect(isRedirectStatus(res.status)).toBe(false);
    expect(res.status).toBeLessThan(400);
  });

  it('does not redirect unauthenticated GET /api/csrf to /auth', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/csrf', method: 'GET' }),
    );
    expect(isRedirectStatus(res.status)).toBe(false);
    expect(res.status).toBeLessThan(400);
  });

  it('does not redirect or 403 unauthenticated POST /api/logs/errors', async () => {
    // POST は CSRF 検証も通る必要がある (sendBeacon はカスタムヘッダ不可)。
    // 単に redirect されないだけでなく、session_exempt まで素通りすることを確認。
    const res = await middleware(
      makeRequest({ pathname: '/api/logs/errors', method: 'POST' }),
    );
    expect(isRedirectStatus(res.status)).toBe(false);
    expect(res.status).toBeLessThan(400);
  });

  it('does not redirect or 403 unauthenticated POST /api/auth/session (OAuth cookie set)', async () => {
    // OAuth callback page が CSRF トークン取得前に POST してくる可能性があるため、
    // CSRF 免除 + session 免除の両方が必要。
    const res = await middleware(
      makeRequest({ pathname: '/api/auth/session', method: 'POST' }),
    );
    expect(isRedirectStatus(res.status)).toBe(false);
    expect(res.status).toBeLessThan(400);
  });

  it('still redirects unauthenticated GET /dashboard to /auth', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/dashboard', method: 'GET' }),
    );
    expect(isRedirectStatus(res.status)).toBe(true);
  });
});
