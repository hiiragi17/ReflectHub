import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Supabase モック (CSRF 経路に到達できれば中身は問わない)。
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

import { generateCSRFToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/utils/csrfToken';
import { middleware } from './middleware';

const ORIGINAL_SECRET = process.env.CSRF_SECRET;

beforeAll(() => {
  process.env.CSRF_SECRET = 'test-secret-for-middleware-1234567890';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CSRF_SECRET;
  else process.env.CSRF_SECRET = ORIGINAL_SECRET;
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

  it('exempts /api/auth/callback', async () => {
    const res = await middleware(
      makeRequest({ pathname: '/api/auth/callback', method: 'POST' }),
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
