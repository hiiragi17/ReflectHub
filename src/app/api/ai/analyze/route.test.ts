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
const reflectionId = '11111111-1111-1111-1111-111111111111';
const reservationId = '22222222-2222-2222-2222-222222222222';

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

const updateChain = (data: unknown, error: unknown = null) => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
});

const deleteChain = () => ({
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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

  it('returns 404 when reflection not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(
      reflectionSelectChain(null, { code: 'PGRST116' }),
    );

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(404);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('returns 429 when slot reservation is denied (rate limit)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(reflectionSelectChain(mockReflection));
    const oldest = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    mockSupabase.rpc.mockResolvedValue({
      data: [{ reservation_id: null, used: 3, oldest_in_window: oldest }],
      error: null,
    });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMITED');
    expect(json.rate_limit.remaining).toBe(0);
    // reset_at は oldest + 24h
    expect(new Date(json.rate_limit.reset_at).getTime()).toBe(
      new Date(oldest).getTime() + 24 * 60 * 60 * 1000,
    );
  });

  it('rolls back reservation and returns 502 when OpenAI fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(reflectionSelectChain(mockReflection))
      .mockReturnValueOnce(frameworkSelectChain());
    mockSupabase.rpc.mockResolvedValue({
      data: [{ reservation_id: reservationId, used: 1, oldest_in_window: null }],
      error: null,
    });

    const del = deleteChain();
    mockSupabase.from.mockReturnValueOnce(del);

    mockCallOpenAI.mockRejectedValue({ code: 'OPENAI_ERROR', message: 'boom' });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(502);
    expect(del.delete).toHaveBeenCalled();
    expect(del.eq).toHaveBeenCalledWith('id', reservationId);
  });

  it('reserves slot, calls OpenAI, updates row, and returns 201 on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from
      .mockReturnValueOnce(reflectionSelectChain(mockReflection))
      .mockReturnValueOnce(frameworkSelectChain())
      .mockReturnValueOnce(updateChain(mockAnalysisRow));

    mockSupabase.rpc.mockResolvedValue({
      data: [{ reservation_id: reservationId, used: 2, oldest_in_window: null }],
      error: null,
    });

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
    // used=2 を返した RPC に対し remaining = 3 - 2 = 1
    expect(json.rate_limit.remaining).toBe(1);
    expect(json.rate_limit.limit).toBe(3);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('reserve_ai_analysis_slot', {
      p_reflection_id: reflectionId,
      p_max_per_window: 3,
      p_window_hours: 24,
    });
  });

  it('returns 500 when reservation RPC errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockSupabase.from.mockReturnValueOnce(reflectionSelectChain(mockReflection));
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'db down' } });

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
    // is_complete=true でフィルタしていることを確認
    expect(chain.eq).toHaveBeenCalledWith('is_complete', true);
  });
});
