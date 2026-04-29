import { describe, it, expect } from 'vitest';
import { buildUserPrompt, parseAnalysisPayload } from './prompt';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

const baseReflection: Reflection = {
  id: 'r1',
  user_id: 'u1',
  framework_id: 'fw-kpt',
  content: { keep: '良い習慣', problem: '時間管理', try: '朝活' },
  reflection_date: '2026-04-29',
  created_at: '2026-04-29T10:00:00Z',
  updated_at: '2026-04-29T10:00:00Z',
};

const framework: Framework = {
  id: 'fw-kpt',
  name: 'kpt',
  display_name: 'KPT',
  schema: [
    { id: 'keep', label: 'Keep', placeholder: '' },
    { id: 'problem', label: 'Problem', placeholder: '' },
    { id: 'try', label: 'Try', placeholder: '' },
  ],
  is_active: true,
  sort_order: 1,
  created_at: '',
  updated_at: '',
};

describe('buildUserPrompt', () => {
  it('includes labels from framework schema', () => {
    const prompt = buildUserPrompt(baseReflection, framework);
    expect(prompt).toContain('Keep');
    expect(prompt).toContain('Problem');
    expect(prompt).toContain('Try');
    expect(prompt).toContain('良い習慣');
  });

  it('omits empty content fields', () => {
    const reflection = { ...baseReflection, content: { keep: '良い習慣', problem: '', try: '' } };
    const prompt = buildUserPrompt(reflection, framework);
    expect(prompt).toContain('良い習慣');
    expect(prompt.match(/^### /gm)?.length).toBe(1);
  });

  it('truncates excessively long fields', () => {
    const long = 'a'.repeat(5000);
    const reflection = { ...baseReflection, content: { keep: long } };
    const prompt = buildUserPrompt(reflection, framework);
    expect(prompt).toContain('以下省略');
    expect(prompt.length).toBeLessThan(long.length);
  });
});

describe('parseAnalysisPayload', () => {
  it('parses well-formed JSON', () => {
    const json = JSON.stringify({
      growth_points: ['成長 1', '成長 2'],
      improvement_suggestions: ['改善 1'],
      emotional_trend: 'positive',
      key_achievements: ['成果 1'],
      challenges: ['課題 1'],
      recommendations: { actions: ['行動 1'], focus_areas: ['テーマ 1'] },
    });
    const result = parseAnalysisPayload(json);
    expect(result.growth_points).toHaveLength(2);
    expect(result.emotional_trend).toBe('positive');
    expect(result.recommendations.actions).toEqual(['行動 1']);
  });

  it('falls back to neutral for invalid emotional_trend', () => {
    const json = JSON.stringify({
      growth_points: [],
      improvement_suggestions: [],
      emotional_trend: 'unknown',
      key_achievements: [],
      challenges: [],
      recommendations: {},
    });
    const result = parseAnalysisPayload(json);
    expect(result.emotional_trend).toBe('neutral');
    expect(result.recommendations.actions).toEqual([]);
    expect(result.recommendations.focus_areas).toEqual([]);
  });

  it('rejects non-JSON text', () => {
    expect(() => parseAnalysisPayload('not json')).toThrow();
  });

  it('rejects array root', () => {
    expect(() => parseAnalysisPayload('[1,2,3]')).toThrow();
  });

  it('filters out non-string array entries', () => {
    const json = JSON.stringify({
      growth_points: ['ok', 1, null, '   ', 'good'],
      improvement_suggestions: [],
      emotional_trend: 'neutral',
      key_achievements: [],
      challenges: [],
      recommendations: { actions: [], focus_areas: [] },
    });
    const result = parseAnalysisPayload(json);
    expect(result.growth_points).toEqual(['ok', 'good']);
  });
});
