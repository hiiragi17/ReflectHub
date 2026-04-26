import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityHeatmap from './ActivityHeatmap';
import type { HeatmapCell } from '@/types/analytics';

const buildHeatmap = (counts: number[]): HeatmapCell[] =>
  counts.map((count, i) => ({
    weekStart: `2026-01-${String(5 + i * 7).padStart(2, '0')}`,
    count,
  }));

describe('ActivityHeatmap', () => {
  it('renders one cell per week with correct aria labels', () => {
    const heatmap = buildHeatmap([0, 1, 2, 3]);
    render(<ActivityHeatmap heatmap={heatmap} />);

    expect(screen.getByText('アクティビティ（直近4週）')).toBeInTheDocument();
    const cells = screen.getAllByRole('listitem');
    expect(cells).toHaveLength(4);
    expect(cells[1].getAttribute('aria-label')).toContain('1件');
    expect(cells[3].getAttribute('aria-label')).toContain('3件');
  });

  it('uses different intensity classes per count bucket', () => {
    const heatmap = buildHeatmap([0, 1, 2, 3, 5]);
    render(<ActivityHeatmap heatmap={heatmap} />);
    const cells = screen.getAllByRole('listitem');
    expect(cells[0].className).toContain('bg-gray-100');
    expect(cells[1].className).toContain('bg-emerald-200');
    expect(cells[2].className).toContain('bg-emerald-400');
    expect(cells[3].className).toContain('bg-emerald-500');
    expect(cells[4].className).toContain('bg-emerald-600');
  });

  it('shows active-week summary text', () => {
    const heatmap = buildHeatmap([0, 1, 0, 2]);
    render(<ActivityHeatmap heatmap={heatmap} />);
    expect(screen.getByText('2 / 4 週で記録')).toBeInTheDocument();
  });

  it('shows empty state when there are no buckets', () => {
    render(<ActivityHeatmap heatmap={[]} />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });
});
