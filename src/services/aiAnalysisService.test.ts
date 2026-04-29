import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@/lib/openai/client', () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: mockCreate } },
  }),
  OPENAI_MODEL: 'gpt-4o-mini',
  ANALYSIS_VERSION: '1.0.0',
}));

import { callOpenAI, getRateLimitWindow, DAILY_RATE_LIMIT } from './aiAnalysisService';
import type { Reflection } from '@/types/reflection';

const reflection: Reflection = {
  id: 'r1',
  user_id: 'u1',
  framework_id: 'fw',
  content: { keep: 'これは良かった' },
  reflection_date: '2026-04-29',
  created_at: '2026-04-29T00:00:00Z',
  updated_at: '2026-04-29T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRateLimitWindow', () => {
  it('returns a 24h rolling window', () => {
    const now = new Date('2026-04-29T12:00:00Z');
    const { start, end } = getRateLimitWindow(now);
    expect(end.toISOString()).toBe(now.toISOString());
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('DAILY_RATE_LIMIT', () => {
  it('is 1 per spec', () => {
    expect(DAILY_RATE_LIMIT).toBe(1);
  });
});

describe('callOpenAI', () => {
  it('returns parsed payload and metadata on success', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              growth_points: ['gp1'],
              improvement_suggestions: ['imp1'],
              emotional_trend: 'positive',
              key_achievements: ['ach1'],
              challenges: ['ch1'],
              recommendations: { actions: ['a1'], focus_areas: ['f1'] },
            }),
          },
        },
      ],
      usage: { total_tokens: 123 },
      model: 'gpt-4o-mini',
    });

    const { payload, metadata } = await callOpenAI(reflection, undefined);
    expect(payload.emotional_trend).toBe('positive');
    expect(payload.growth_points).toEqual(['gp1']);
    expect(metadata).toEqual({
      tokens_used: 123,
      model: 'gpt-4o-mini',
      version: '1.0.0',
    });
  });

  it('throws OPENAI_ERROR when client fails', async () => {
    mockCreate.mockRejectedValue(new Error('boom'));
    await expect(callOpenAI(reflection, undefined)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    });
  });

  it('throws OPENAI_ERROR on empty content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] });
    await expect(callOpenAI(reflection, undefined)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    });
  });

  it('throws OPENAI_ERROR on unparseable content', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
      usage: { total_tokens: 10 },
    });
    await expect(callOpenAI(reflection, undefined)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    });
  });
});
