import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSupabase, mockCallOpenAI } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
  mockCallOpenAI: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock('@/services/aiAnalysisService', async () => {
  const actual = await vi.importActual<typeof import('@/services/aiAnalysisService')>(
    '@/services/aiAnalysisService',
  );
  return {
    ...actual,
    callOpenAI: mockCallOpenAI,
  };
});

import { POST, GET } from './route';

const USER = { id: 'user-1' };
// 有効な UUID v4 形式（version=4, variant=8）
const reflectionId = '11111111-1111-4111-8111-111111111111';
const reservationId = '22222222-2222-4222-8222-222222222222';

const mockReflection = {
  id: reflectionId,
  user_id: USER.id,
  framework_id: 'fw',
  content: { keep: '良かったこと' },
  reflection_date: '2026-04-29',
  created_at: '2026-04-29T00:00:00Z',
  updated_at: '2026-04-29T00:00:00Z',
};

const mockAnalysisRow = {
  id: reservationId,
  user_id: USER.id,
  reflection_id: reflectionId,
  growth_points: ['gp'],
  improvement_suggestions: ['imp'],
  emotional_trend: 'positive',
  key_achievements: ['ach'],
  challenges: ['ch'],
  recommendations: { actions: ['a'], focus_areas: ['f'] },
  metadata: { tokens_used: 100, model: 'gpt-4o-mini', version: '1.0.0' },
  is_complete: true,
  created_at: '2026-04-29T01:00:00Z',
  updated_at: '2026-04-29T01:00:00Z',
};

const makePostRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const reflectionSelectChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
});

const frameworkSelectChain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/ai/analyze', () => {
  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });
    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when reflection_id missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when reflection_id is not a UUID', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makePostRequest({ reflection_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns 404 when reflection not found (PGRST116)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      reflectionSelectChain(null, { code: 'PGRST116' }),
    );

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(404);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('returns 500 when reflection lookup fails with non-404 DB error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      reflectionSelectChain(null, { code: 'OTHER', message: 'db boom' }),
    );

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('maps RPC ownership failure (42501) to 404', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(reflectionSelectChain(mockReflection));
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'reflection not found or not owned by user' },
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(404);
  });

  it('returns 429 with next_available_at as reset_at when slot reservation is denied', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(reflectionSelectChain(mockReflection));
    const nextAvailable = new Date(Date.now() + 60 * 1000).toISOString();
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [{ reservation_id: null, used: 3, next_available_at: nextAvailable }],
      error: null,
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMITED');
    expect(json.rate_limit.remaining).toBe(0);
    // RPC が返す next_available_at がそのまま reset_at に使われる
    expect(json.rate_limit.reset_at).toBe(nextAvailable);
  });

  it('rolls back reservation via RPC and returns 502 when OpenAI fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(reflectionSelectChain(mockReflection))
      .mockReturnValueOnce(frameworkSelectChain());
    mockSupabase.rpc
      // reserve_ai_analysis_slot
      .mockResolvedValueOnce({
        data: [{ reservation_id: reservationId, used: 1, next_available_at: null }],
        error: null,
      })
      // release_ai_analysis_slot
      .mockResolvedValueOnce({ data: true, error: null });

    mockCallOpenAI.mockRejectedValue({ code: 'OPENAI_ERROR', message: 'boom' });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(502);
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'release_ai_analysis_slot', {
      p_reservation_id: reservationId,
    });
  });

  it('reserves, calls OpenAI, completes via RPC, returns 201 on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(reflectionSelectChain(mockReflection))
      .mockReturnValueOnce(frameworkSelectChain());

    const nextAvailable = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    mockSupabase.rpc
      // reserve_ai_analysis_slot
      .mockResolvedValueOnce({
        data: [
          { reservation_id: reservationId, used: 2, next_available_at: nextAvailable },
        ],
        error: null,
      })
      // complete_ai_analysis
      .mockResolvedValueOnce({ data: mockAnalysisRow, error: null });

    mockCallOpenAI.mockResolvedValue({
      payload: {
        growth_points: ['gp'],
        improvement_suggestions: ['imp'],
        emotional_trend: 'positive',
        key_achievements: ['ach'],
        challenges: ['ch'],
        recommendations: { actions: ['a'], focus_areas: ['f'] },
      },
      metadata: { tokens_used: 100, model: 'gpt-4o-mini', version: '1.0.0' },
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.analysis.id).toBe(reservationId);
    expect(json.rate_limit.remaining).toBe(1);
    expect(json.rate_limit.limit).toBe(3);
    expect(json.rate_limit.reset_at).toBe(nextAvailable);

    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'reserve_ai_analysis_slot', {
      p_reflection_id: reflectionId,
      p_max_per_window: 3,
      p_window_hours: 24,
      p_lease_seconds: 300,
    });
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(
      2,
      'complete_ai_analysis',
      expect.objectContaining({
        p_reservation_id: reservationId,
        p_emotional_trend: 'positive',
      }),
    );
  });

  it('releases reservation when complete_ai_analysis fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(reflectionSelectChain(mockReflection))
      .mockReturnValueOnce(frameworkSelectChain());

    mockSupabase.rpc
      .mockResolvedValueOnce({
        data: [{ reservation_id: reservationId, used: 1, next_available_at: null }],
        error: null,
      })
      // complete_ai_analysis fails
      .mockResolvedValueOnce({ data: null, error: { message: 'update boom' } })
      // release_ai_analysis_slot
      .mockResolvedValueOnce({ data: true, error: null });

    mockCallOpenAI.mockResolvedValue({
      payload: {
        growth_points: [],
        improvement_suggestions: [],
        emotional_trend: 'neutral',
        key_achievements: [],
        challenges: [],
        recommendations: { actions: [], focus_areas: [] },
      },
      metadata: { tokens_used: 0, model: 'gpt-4o-mini', version: '1.0.0' },
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(500);
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(3, 'release_ai_analysis_slot', {
      p_reservation_id: reservationId,
    });
  });

  it('returns 500 when reservation RPC errors with unknown code', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(reflectionSelectChain(mockReflection));
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'P0001', message: 'db down' },
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/ai/analyze', () => {
  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });
    const req = new NextRequest(
      `http://localhost/api/ai/analyze?reflection_id=${reflectionId}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when reflection_id missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const req = new NextRequest('http://localhost/api/ai/analyze');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when reflection_id is not a UUID', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const req = new NextRequest('http://localhost/api/ai/analyze?reflection_id=foo');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('returns latest completed analysis or null', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockAnalysisRow, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const req = new NextRequest(
      `http://localhost/api/ai/analyze?reflection_id=${reflectionId}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis.id).toBe(reservationId);
    expect(chain.eq).toHaveBeenCalledWith('is_complete', true);
  });
});
