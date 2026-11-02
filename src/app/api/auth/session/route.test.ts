import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => {
    throw new Error('自サイト以外のリクエストでは、Supabase に触れてはいけない');
  }),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => {
    throw new Error('自サイト以外のリクエストでは、Cookie に触れてはいけない');
  }),
}));

import { POST } from './route';

const body = JSON.stringify({ access_token: 'a', refresh_token: 'r' });

describe('POST /api/auth/session の Origin 確認', () => {
  it('他サイトからのリクエストは 403 で拒否し、セッションを設定しない', async () => {
    const req = new NextRequest('http://localhost/api/auth/session', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('Origin が別のホストなら 403', async () => {
    const req = new NextRequest('http://localhost/api/auth/session', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.net',
        host: 'app.example.com',
        'content-type': 'application/json',
      },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('Origin も Sec-Fetch-Site もなければ 403', async () => {
    const req = new NextRequest('http://localhost/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('自サイトからのリクエストは、Origin の確認では止めない', async () => {
    const req = new NextRequest('http://localhost/api/auth/session', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
      body,
    });
    const res = await POST(req);
    // この先は、モックが例外を投げるので 500 になる。403 でないことだけを確認する
    expect(res.status).not.toBe(403);
  });
});
