import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSupabase, mockCallOpenAI } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
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
  id: 'a1',
  user_id: USER.id,
  reflection_id: reflectionId,
  growth_points: ['gp'],
  improvement_suggestions: ['imp'],
  emotional_trend: 'positive',
  key_achievements: ['ach'],
  challenges: ['ch'],
  recommendations: { actions: ['a'], focus_areas: ['f'] },
  metadata: { tokens_used: 100, model: 'gpt-4o-mini', version: '1.0.0' },
  created_at: '2026-04-29T01:00:00Z',
  updated_at: '2026-04-29T01:00:00Z',
};

const makePostRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
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

  it('returns 429 when rate limit reached', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
    };
    mockSupabase.from.mockReturnValue(countChain);

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('returns 404 when reflection not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };
    const reflectionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    };
    mockSupabase.from
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(reflectionChain);

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(404);
  });

  it('returns 502 when OpenAI fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };
    const reflectionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockReflection, error: null }),
    };
    const frameworkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(reflectionChain)
      .mockReturnValueOnce(frameworkChain);

    mockCallOpenAI.mockRejectedValue({ code: 'OPENAI_ERROR', message: 'boom' });

    const res = await POST(makePostRequest({ reflection_id: reflectionId }));
    expect(res.status).toBe(502);
  });

  it('persists analysis and returns 201 on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    const reflectionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockReflection, error: null }),
    };
    const frameworkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockAnalysisRow, error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(reflectionChain)
      .mockReturnValueOnce(frameworkChain)
      .mockReturnValueOnce(insertChain);

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
    expect(json.analysis.id).toBe('a1');
    expect(json.rate_limit.remaining).toBe(1);
    expect(json.rate_limit.limit).toBe(3);
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

  it('returns latest analysis or null', async () => {
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
    expect(json.analysis.id).toBe('a1');
  });
});
