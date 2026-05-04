import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SummaryPanel } from './SummaryPanel';

const completedSummary = {
  id: 'sum-1',
  user_id: 'u1',
  period: 'week',
  period_start: '2026-04-13',
  period_end: '2026-04-19',
  reflection_count: 3,
  recurring_themes: ['時間管理'],
  sustained_practices: ['朝活'],
  emerging_challenges: [],
  growth_summary: '安定して継続できています。',
  mood_trend: 'stable',
  recommendations: { actions: ['ポモドーロ'], focus_areas: ['集中環境'] },
  metadata: { tokens_used: 1, model: 'gpt-4o-mini', version: '1.0.0' },
  created_at: '2026-04-19T12:00:00Z',
  updated_at: '2026-04-19T12:00:00Z',
};

describe('SummaryPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('既存のサマリーがあれば表示する', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ summary: completedSummary }), { status: 200 }),
    );

    render(<SummaryPanel />);

    await waitFor(() => {
      expect(screen.getByText('時間管理')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mood-trend')).toBeInTheDocument();
    expect(screen.getByText(/3 件の振り返り/)).toBeInTheDocument();
  });

  it('サマリーが無ければ空状態を表示する', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ summary: null }), { status: 200 }),
    );

    render(<SummaryPanel />);

    await waitFor(() => {
      expect(screen.getByText(/まだ生成されていません/)).toBeInTheDocument();
    });
  });

  it('期間タブを切り替えるとフェッチが再実行される', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ summary: null }), { status: 200 }),
      );

    render(<SummaryPanel />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/summary?period=week',
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByTestId('period-tab-month'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/summary?period=month',
        expect.any(Object),
      );
    });
  });

  it('分析ボタンを押すと POST が呼ばれる', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: null }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            summary: completedSummary,
            rate_limit: { remaining: 1, limit: 2, reset_at: '2026-04-20T00:00:00Z' },
          }),
          { status: 201 },
        ),
      );

    render(<SummaryPanel />);

    await waitFor(() => {
      expect(screen.getByText(/まだ生成されていません/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('analyze-button'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/summary',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('時間管理')).toBeInTheDocument();
    });
  });
});
