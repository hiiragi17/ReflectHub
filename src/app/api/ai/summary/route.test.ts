import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSupabase, callOpenAISummaryMock } = vi.hoisted(() => {
  return {
    mockSupabase: {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      rpc: vi.fn(),
    },
    callOpenAISummaryMock: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock('@/services/aiSummaryService', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/aiSummaryService')
  >('@/services/aiSummaryService');
  return {
    ...actual,
    callOpenAISummary: callOpenAISummaryMock,
  };
});

import { POST, GET } from './route';

const USER = { id: 'user-1' };

const RESERVATION_ID = '22222222-2222-4222-8222-222222222222';

const reflection = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: USER.id,
  framework_id: 'fw-1',
  content: { keep: 'うまくいった' },
  reflection_date: '2026-04-15',
  created_at: '',
  updated_at: '',
};

const completedSummary = {
  id: 'sum-1',
  user_id: USER.id,
  period: 'week',
  period_start: '2026-04-13',
  period_end: '2026-04-19',
  reflection_count: 1,
  recurring_themes: ['t'],
  sustained_practices: [],
  emerging_challenges: [],
  growth_summary: 'g',
  mood_trend: 'stable',
  recommendations: { actions: [], focus_areas: [] },
  metadata: { tokens_used: 1, model: 'gpt-4o-mini', version: '1.0.0' },
  is_complete: true,
  expires_at: null,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
};

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/summary', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeGetRequest(period?: string) {
  const url = period
    ? `http://localhost/api/ai/summary?period=${period}`
    : 'http://localhost/api/ai/summary';
  return new NextRequest(url);
}

function setupReflectionsQuery(rows: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  return chain;
}

describe('POST /api/ai/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOpenAISummaryMock.mockReset();
  });

  it('未認証なら 401', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(401);
  });

  it('period が不正なら 400', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makePostRequest({ period: 'yearly' }));
    expect(res.status).toBe(400);
  });

  it('期間内に振り返りがなければ NO_REFLECTIONS', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockImplementation(() => setupReflectionsQuery([]));
    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('NO_REFLECTIONS');
  });

  it('レート制限に達していたら 429', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockImplementation(() => setupReflectionsQuery([reflection]));
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        {
          reservation_id: null,
          used: 2,
          next_available_at: '2026-04-16T00:00:00Z',
          duplicate: false,
        },
      ],
      error: null,
    });

    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMITED');
    expect(json.rate_limit.remaining).toBe(0);
  });

  it('同一期間の連続生成は 409 DUPLICATE_PERIOD', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockImplementation(() => setupReflectionsQuery([reflection]));
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        {
          reservation_id: null,
          used: null,
          next_available_at: null,
          duplicate: true,
        },
      ],
      error: null,
    });

    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe('DUPLICATE_PERIOD');
  });

  it('成功時に保存し 201 を返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    let fromCalls = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCalls += 1;
      if (table === 'retrospectives') return setupReflectionsQuery([reflection]);
      if (table === 'frameworks') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    mockSupabase.rpc.mockImplementation((fn: string) => {
      if (fn === 'reserve_ai_summary_slot') {
        return Promise.resolve({
          data: [
            {
              reservation_id: RESERVATION_ID,
              used: 1,
              next_available_at: '2026-04-16T00:00:00Z',
              duplicate: false,
            },
          ],
          error: null,
        });
      }
      if (fn === 'complete_ai_summary') {
        return Promise.resolve({ data: completedSummary, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    callOpenAISummaryMock.mockResolvedValueOnce({
      payload: {
        recurring_themes: ['t'],
        sustained_practices: [],
        emerging_challenges: [],
        growth_summary: 'g',
        mood_trend: 'stable',
        recommendations: { actions: [], focus_areas: [] },
      },
      metadata: { tokens_used: 1, model: 'gpt-4o-mini', version: '1.0.0' },
    });

    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.summary.id).toBe('sum-1');
    expect(json.rate_limit.limit).toBe(2);
    expect(json.rate_limit.remaining).toBe(1);
    expect(fromCalls).toBeGreaterThanOrEqual(1);
  });

  it('OpenAI 失敗時は予約を解放して 502', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockImplementation(() => setupReflectionsQuery([reflection]));

    const releaseSpy = vi.fn().mockResolvedValue({ data: true, error: null });
    mockSupabase.rpc.mockImplementation((fn: string) => {
      if (fn === 'reserve_ai_summary_slot') {
        return Promise.resolve({
          data: [
            {
              reservation_id: RESERVATION_ID,
              used: 1,
              next_available_at: null,
              duplicate: false,
            },
          ],
          error: null,
        });
      }
      if (fn === 'release_ai_summary_slot') return releaseSpy();
      return Promise.resolve({ data: null, error: null });
    });

    callOpenAISummaryMock.mockRejectedValueOnce({
      code: 'OPENAI_ERROR',
      message: 'boom',
    });

    const res = await POST(makePostRequest({ period: 'week' }));
    expect(res.status).toBe(502);
    expect(releaseSpy).toHaveBeenCalled();
  });
});

describe('GET /api/ai/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未認証なら 401', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeGetRequest('week'));
    expect(res.status).toBe(401);
  });

  it('period 未指定なら 400', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(400);
  });

  it('該当期間のサマリーを返す', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: completedSummary, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET(makeGetRequest('week'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.id).toBe('sum-1');
  });
});
