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

vi.mock('@/utils/csrfToken', () => ({
  CSRF_COOKIE_NAME: 'reflecthub-csrf',
  CSRF_HEADER_NAME: 'x-csrf-token',
  verifyCSRF: vi.fn().mockReturnValue({ ok: true }),
}));

import { POST } from './route';

const USER = { id: 'user-1' };
const ENDPOINT = 'https://fcm.googleapis.com/push/abc';

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

describe('POST /api/push/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });

    const res = await POST(makeRequest({ endpoint: ENDPOINT }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when endpoint is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const eqInner = vi.fn().mockResolvedValue({ error: null });
    const eqOuter = vi.fn().mockReturnValue({ eq: eqInner });
    const update = vi.fn().mockReturnValue({ eq: eqOuter });
    mockSupabase.from.mockReturnValue({ update });

    const res = await POST(makeRequest({ endpoint: ENDPOINT }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 when database fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const eqInner = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const eqOuter = vi.fn().mockReturnValue({ eq: eqInner });
    const update = vi.fn().mockReturnValue({ eq: eqOuter });
    mockSupabase.from.mockReturnValue({ update });

    const res = await POST(makeRequest({ endpoint: ENDPOINT }));
    expect(res.status).toBe(500);
  });
});
