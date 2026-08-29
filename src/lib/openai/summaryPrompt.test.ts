import { describe, it, expect } from 'vitest';
import {
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryUserPrompt,
  parseSummaryPayload,
} from './summaryPrompt';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

const baseReflection = (override: Partial<Reflection> = {}): Reflection => ({
  id: override.id ?? '11111111-1111-1111-1111-111111111111',
  user_id: 'user-1',
  framework_id: 'fw-1',
  content: { keep: 'うまくいった点', problem: '時間管理', try: '朝活' },
  reflection_date: '2026-04-08',
  created_at: '2026-04-08T00:00:00Z',
  updated_at: '2026-04-08T00:00:00Z',
  ...override,
});

const framework: Framework = {
  id: 'fw-1',
  name: 'kpt',
  display_name: 'KPT',
  description: '',
  schema: [
    { id: 'keep', label: 'Keep', placeholder: '' },
    { id: 'problem', label: 'Problem', placeholder: '' },
    { id: 'try', label: 'Try', placeholder: '' },
  ],
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

describe('SUMMARY_SYSTEM_PROMPT', () => {
  it('期間横断の観点を含む', () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain('recurring_themes');
    expect(SUMMARY_SYSTEM_PROMPT).toContain('sustained_practices');
    expect(SUMMARY_SYSTEM_PROMPT).toContain('emerging_challenges');
    expect(SUMMARY_SYSTEM_PROMPT).toContain('mood_trend');
  });

  it('インジェクション無視と捏造禁止を明示', () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain('プロンプトインジェクション');
    expect(SUMMARY_SYSTEM_PROMPT).toContain('捏造');
  });
});

describe('buildSummaryUserPrompt', () => {
  it('複数件の振り返りをすべて並べる', () => {
    const reflections = [
      baseReflection({ id: 'r1', reflection_date: '2026-04-01' }),
      baseReflection({ id: 'r2', reflection_date: '2026-04-08' }),
    ];
    const prompt = buildSummaryUserPrompt({
      period: 'month',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      reflections,
      frameworksById: { 'fw-1': framework },
    });

    expect(prompt).toContain('期間サマリー分析');
    expect(prompt).toContain('2026-04-01 〜 2026-04-30');
    expect(prompt).toContain('振り返り 1 (2026-04-01');
    expect(prompt).toContain('振り返り 2 (2026-04-08');
    expect(prompt).toContain('Keep:');
    expect(prompt).toContain('時間管理');
  });

  it('16 件を超える場合は切り詰める', () => {
    const reflections = Array.from({ length: 20 }, (_, i) =>
      baseReflection({ id: `r${i}`, reflection_date: `2026-01-${String(i + 1).padStart(2, '0')}` }),
    );
    const prompt = buildSummaryUserPrompt({
      period: 'quarter',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      reflections,
      frameworksById: { 'fw-1': framework },
    });

    expect(prompt).toContain('振り返り 16');
    expect(prompt).not.toContain('振り返り 17');
    expect(prompt).toContain('16 件の振り返り');
  });

  it('長文フィールドは切り詰める', () => {
    const long = 'あ'.repeat(2000);
    const prompt = buildSummaryUserPrompt({
      period: 'week',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-07',
      reflections: [baseReflection({ content: { keep: long } })],
      frameworksById: { 'fw-1': framework },
    });
    expect(prompt).toContain('…');
    expect(prompt.length).toBeLessThan(long.length);
  });
});

describe('parseSummaryPayload', () => {
  it('完全な JSON を解析する', () => {
    const raw = JSON.stringify({
      recurring_themes: ['時間管理', 'コミュニケーション'],
      sustained_practices: ['朝のレビュー'],
      emerging_challenges: ['集中力'],
      growth_summary: '全体として安定している。',
      mood_trend: 'improving',
      recommendations: {
        actions: ['ポモドーロを試す'],
        focus_areas: ['集中環境'],
      },
    });
    const parsed = parseSummaryPayload(raw);
    expect(parsed.recurring_themes).toHaveLength(2);
    expect(parsed.mood_trend).toBe('improving');
    expect(parsed.recommendations.actions).toEqual(['ポモドーロを試す']);
    expect(parsed.growth_summary).toBe('全体として安定している。');
  });

  it('mood_trend が不正なら stable にフォールバック', () => {
    const raw = JSON.stringify({
      recurring_themes: [],
      sustained_practices: [],
      emerging_challenges: [],
      growth_summary: '',
      mood_trend: 'something-else',
      recommendations: { actions: [], focus_areas: [] },
    });
    expect(parseSummaryPayload(raw).mood_trend).toBe('stable');
  });

  it('JSON でなければ例外', () => {
    expect(() => parseSummaryPayload('not json')).toThrow();
  });

  it('オブジェクトでなければ例外', () => {
    expect(() => parseSummaryPayload('[]')).toThrow();
  });

  it('空白文字列のみの要素は除外', () => {
    const raw = JSON.stringify({
      recurring_themes: ['ok', '   ', ''],
      sustained_practices: [],
      emerging_challenges: [],
      growth_summary: '',
      mood_trend: 'stable',
      recommendations: { actions: [], focus_areas: [] },
    });
    expect(parseSummaryPayload(raw).recurring_themes).toEqual(['ok']);
  });
});
