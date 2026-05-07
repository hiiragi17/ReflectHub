import { describe, it, expect, beforeEach, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/openai/client', () => ({
  getOpenAIClient: () => ({
    chat: { completions: { create: createMock } },
  }),
  OPENAI_MODEL: 'gpt-4o-mini',
  ANALYSIS_VERSION: '1.0.0',
}));

import {
  callOpenAISummary,
  resolvePeriodRange,
} from './aiSummaryService';
import type { SummaryError } from '@/types/summary';

describe('resolvePeriodRange', () => {
  it('week: 月曜始まり〜日曜終わり', () => {
    const range = resolvePeriodRange('week', new Date('2026-04-15T12:00:00Z'));
    // start should be a Monday on/before 2026-04-15 (which is a Wednesday)
    expect(range.start <= '2026-04-15').toBe(true);
    expect(range.end >= '2026-04-15').toBe(true);
  });

  it('month: 月初〜月末', () => {
    const range = resolvePeriodRange('month', new Date('2026-04-15T12:00:00Z'));
    expect(range.start).toBe('2026-04-01');
    expect(range.end).toBe('2026-04-30');
  });

  it('quarter: 四半期', () => {
    const range = resolvePeriodRange('quarter', new Date('2026-05-15T12:00:00Z'));
    expect(range.start).toBe('2026-04-01');
    expect(range.end).toBe('2026-06-30');
  });
});

describe('callOpenAISummary', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  const baseInput = {
    period: 'week' as const,
    periodStart: '2026-04-01',
    periodEnd: '2026-04-07',
    reflections: [
      {
        id: 'r1',
        user_id: 'u1',
        framework_id: 'fw-1',
        content: { keep: 'うまくいった' },
        reflection_date: '2026-04-01',
        created_at: '',
        updated_at: '',
      },
    ],
    frameworksById: {},
  };

  it('成功時に payload と metadata を返す', async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              recurring_themes: ['時間管理'],
              sustained_practices: ['朝活'],
              emerging_challenges: [],
              growth_summary: '安定',
              mood_trend: 'stable',
              recommendations: { actions: [], focus_areas: [] },
            }),
          },
        },
      ],
      usage: { total_tokens: 1500 },
      model: 'gpt-4o-mini',
    });

    const { payload, metadata } = await callOpenAISummary(baseInput);
    expect(payload.recurring_themes).toEqual(['時間管理']);
    expect(metadata.tokens_used).toBe(1500);
    expect(metadata.model).toBe('gpt-4o-mini');
  });

  it('OpenAI が失敗したら OPENAI_ERROR', async () => {
    createMock.mockRejectedValueOnce(new Error('boom'));
    await expect(callOpenAISummary(baseInput)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    } satisfies Partial<SummaryError>);
  });

  it('空応答は OPENAI_ERROR', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '' } }],
    });
    await expect(callOpenAISummary(baseInput)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    });
  });

  it('JSON 解析失敗は OPENAI_ERROR', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json' } }],
    });
    await expect(callOpenAISummary(baseInput)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
    });
  });

  it('応答に API キー形式の機密が含まれていたら破棄する', async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              recurring_themes: ['leaked sk-abcdefghijklmnopqrstuvwxyz'],
              sustained_practices: [],
              emerging_challenges: [],
              growth_summary: '',
              mood_trend: 'stable',
              recommendations: { actions: [], focus_areas: [] },
            }),
          },
        },
      ],
    });
    await expect(callOpenAISummary(baseInput)).rejects.toMatchObject({
      code: 'OPENAI_ERROR',
      message: expect.stringContaining('破棄'),
    });
  });
});
