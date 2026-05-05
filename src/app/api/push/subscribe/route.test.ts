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

vi.mock('@/lib/push/encryption', () => ({
  validatePushSubscriptionFields: vi.fn().mockReturnValue(null),
}));

vi.mock('@/utils/csrfToken', () => ({
  CSRF_COOKIE_NAME: 'reflecthub-csrf',
  CSRF_HEADER_NAME: 'x-csrf-token',
  verifyCSRF: vi.fn().mockReturnValue({ ok: true }),
}));

import { POST } from './route';
import { validatePushSubscriptionFields } from '@/lib/push/encryption';

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

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validatePushSubscriptionFields).mockReturnValue(null);
  });

  it('returns 403 when CSRF verification fails', async () => {
    const csrf = await import('@/utils/csrfToken');
    vi.mocked(csrf.verifyCSRF).mockReturnValueOnce({ ok: false, reason: 'mismatch' });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    vi.mocked(csrf.verifyCSRF).mockReturnValue({ ok: true });
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

  it('returns 400 when validation fails', async () => {
    vi.mocked(validatePushSubscriptionFields).mockReturnValue('endpoint は有効な HTTPS URL である必要があります。');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const res = await POST(makeRequest(VALID_BODY));
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
