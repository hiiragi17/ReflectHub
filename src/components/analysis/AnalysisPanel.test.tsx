import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Analysis } from '@/types/analysis';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { AnalysisPanel } from './AnalysisPanel';

const buildAnalysis = (): Analysis => ({
  id: 'a1',
  user_id: 'u1',
  reflection_id: 'r1',
  growth_points: ['成長ポイント A'],
  improvement_suggestions: ['改善提案 A'],
  emotional_trend: 'positive',
  key_achievements: ['成果 A'],
  challenges: ['課題 A'],
  recommendations: { actions: ['行動 A'], focus_areas: ['テーマ A'] },
  metadata: { tokens_used: 100, model: 'gpt-4o-mini', version: '1.0.0' },
  created_at: '2026-04-29T01:00:00Z',
  updated_at: '2026-04-29T01:00:00Z',
});

const okJson = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    json: async () => data,
    clone() {
      return this;
    },
  }) as unknown as Response;

beforeEach(() => {
  fetchMock.mockReset();
});

describe('AnalysisPanel', () => {
  it('shows existing analysis when fetched', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ analysis: buildAnalysis() }));

    render(<AnalysisPanel reflectionId="r1" />);

    await waitFor(() => {
      expect(screen.getByText('成長ポイント A')).toBeInTheDocument();
    });
    expect(screen.getByText('改善提案 A')).toBeInTheDocument();
    expect(screen.getByTestId('emotional-trend')).toBeInTheDocument();
  });

  it('shows empty state when no analysis exists', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ analysis: null }));

    render(<AnalysisPanel reflectionId="r1" />);

    await waitFor(() => {
      expect(
        screen.getByText('この振り返りはまだ分析されていません。'),
      ).toBeInTheDocument();
    });
  });

  it('triggers analyze on button click', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(okJson({ analysis: null }))
      .mockResolvedValueOnce(
        okJson({
          analysis: buildAnalysis(),
          rate_limit: { remaining: 2, limit: 3, reset_at: '2026-04-30T00:00:00Z' },
        }),
      );

    render(<AnalysisPanel reflectionId="r1" />);

    const button = await screen.findByRole('button', { name: /AI 分析を実行/ });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('成長ポイント A')).toBeInTheDocument();
    });
    expect(screen.getByText(/残り 2 \/ 3 回/)).toBeInTheDocument();
  });
});
