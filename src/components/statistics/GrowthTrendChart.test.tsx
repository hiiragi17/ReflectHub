import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthTrendChart from './GrowthTrendChart';
import type { AnalyticsTrends, TrendPoint } from '@/types/analytics';

beforeAll(() => {
  // Recharts' ResponsiveContainer relies on these to render in jsdom.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 256,
  });
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }
});

const point = (period: string, count: number): TrendPoint => ({
  period,
  count,
  characters: count * 100,
});

const buildTrends = (monthly: TrendPoint[]): AnalyticsTrends => ({
  weekly: [],
  monthly,
});

describe('GrowthTrendChart', () => {
  it('renders title with the configured month window', () => {
    const trends = buildTrends([
      point('2026-03', 1),
      point('2026-04', 2),
      point('2026-05', 3),
    ]);

    render(<GrowthTrendChart trends={trends} />);

    expect(screen.getByText('3ヶ月の成長')).toBeInTheDocument();
  });

  it('summarises additions across the displayed window', () => {
    const trends = buildTrends([
      point('2026-01', 5), // outside default 3-month window
      point('2026-02', 5), // outside default 3-month window
      point('2026-03', 1),
      point('2026-04', 2),
      point('2026-05', 3),
    ]);

    render(<GrowthTrendChart trends={trends} />);

    // Summary should include only the last 3 months: 1 + 2 + 3 = 6
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/直近3ヶ月で/)).toBeInTheDocument();
  });

  it('honours a custom months window', () => {
    const trends = buildTrends([
      point('2026-03', 1),
      point('2026-04', 2),
      point('2026-05', 3),
    ]);

    render(<GrowthTrendChart trends={trends} months={2} />);

    expect(screen.getByText('2ヶ月の成長')).toBeInTheDocument();
    // 2 + 3 = 5 over the last 2 months
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders without crashing when monthly data is empty', () => {
    const trends = buildTrends([]);
    render(<GrowthTrendChart trends={trends} />);
    expect(screen.getByText('3ヶ月の成長')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
