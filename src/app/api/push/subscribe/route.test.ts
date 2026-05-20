import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { POST } from './route';

const USER = { id: 'user-1' };
const VALID_BODY = {
  endpoint: 'https://fcm.googleapis.com/push/abc',
  p256dh: 'BNb2B0dAi8Q=',
  auth: 'tBHItJI5svbpez7KI4CCXg==',
};

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

// Note: CSRF 検証は middleware に移ったため本ファイルでは検証しない。
// middleware の単体テスト (`middleware.test.ts`) で個別にカバーしている。
describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest({ endpoint: 'https://example.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when endpoint is not https', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest({ ...VALID_BODY, endpoint: 'http://example.com/x' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when endpoint targets a private host', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest({ ...VALID_BODY, endpoint: 'https://localhost/x' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when auth is not base64url', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest({ ...VALID_BODY, auth: 'has spaces!' }));
    expect(res.status).toBe(400);
  });

  it('returns 201 when subscription is created', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const mockChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'sub-1', ...VALID_BODY, user_id: USER.id, is_active: true },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.subscription.id).toBe('sub-1');
  });

  it('returns 500 when database fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const mockChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
