import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockUserId = 'user-test-123';

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockRange = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

  const fromMock = vi.fn().mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    range: mockRange,
  });

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null,
      }),
    },
    from: fromMock,
    ...overrides,
  };
}

describe('POST /api/logs/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when body is missing logs array', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(makeSupabaseMock());

    const req = new NextRequest('http://localhost/api/logs/errors', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sess_1' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 200 and received count on success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(makeSupabaseMock());

    const logs = [
      {
        id: 'log1',
        userId: mockUserId,
        errorType: 'network',
        message: 'Network error',
        context: { page: '/', url: 'http://localhost/', timestamp: Date.now() },
        severity: 'error',
        resolved: false,
        createdAt: Date.now(),
      },
    ];

    const req = new NextRequest('http://localhost/api/logs/errors', {
      method: 'POST',
      body: JSON.stringify({ logs, sessionId: 'sess_1', batchId: 'b1', sentAt: Date.now() }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.received).toBe(1);
  });

  it('returns 500 when DB insert fails', async () => {
    const supabase = makeSupabaseMock();
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(supabase);

    const logs = [
      {
        id: 'log2',
        errorType: 'server',
        message: 'Server error',
        context: { page: '/', url: 'http://localhost/', timestamp: Date.now() },
        severity: 'critical',
        resolved: false,
        createdAt: Date.now(),
      },
    ];

    const req = new NextRequest('http://localhost/api/logs/errors', {
      method: 'POST',
      body: JSON.stringify({ logs, sessionId: 'sess_1', batchId: 'b2', sentAt: Date.now() }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/logs/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(supabase);

    const req = new NextRequest('http://localhost/api/logs/errors');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user_id does not match session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(makeSupabaseMock());

    const req = new NextRequest(
      'http://localhost/api/logs/errors?user_id=other-user'
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns paginated logs for authenticated user', async () => {
    const mockLogs = [{ id: 'l1', message: 'err', user_id: mockUserId }];
    const supabase = makeSupabaseMock();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockLogs, error: null, count: 1 }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockResolvedValue(supabase);

    const req = new NextRequest(
      `http://localhost/api/logs/errors?user_id=${mockUserId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.logs).toHaveLength(1);
    expect(data.total).toBe(1);
  });
});
