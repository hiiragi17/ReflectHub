import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthTrendChart from './GrowthTrendChart';
import type { AnalyticsTrends, TrendPoint } from '@/types/analytics';

let originalClientWidth: PropertyDescriptor | undefined;
let originalClientHeight: PropertyDescriptor | undefined;
const originalResizeObserver = globalThis.ResizeObserver;
let didStubResizeObserver = false;

beforeAll(() => {
  originalClientWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth',
  );
  originalClientHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientHeight',
  );

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
    didStubResizeObserver = true;
  }
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
  }
  if (didStubResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver;
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
    expect(
      screen.getByText((_, node) => node?.textContent === '直近3ヶ月で 6 件'),
    ).toBeInTheDocument();
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
    expect(
      screen.getByText((_, node) => node?.textContent === '直近2ヶ月で 5 件'),
    ).toBeInTheDocument();
  });

  it('renders without crashing when monthly data is empty', () => {
    const trends = buildTrends([]);
    render(<GrowthTrendChart trends={trends} />);
    expect(screen.getByText('3ヶ月の成長')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === '直近3ヶ月で 0 件'),
    ).toBeInTheDocument();
  });

  it('normalises non-positive or non-integer months to the default window', () => {
    const trends = buildTrends([
      point('2026-01', 5),
      point('2026-02', 5),
      point('2026-03', 1),
      point('2026-04', 2),
      point('2026-05', 3),
    ]);

    // months=0 must NOT produce slice(-0) (which returns the full array).
    const { rerender } = render(<GrowthTrendChart trends={trends} months={0} />);
    expect(screen.getByText('3ヶ月の成長')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === '直近3ヶ月で 6 件'),
    ).toBeInTheDocument();

    // Negative values fall back to the default too.
    rerender(<GrowthTrendChart trends={trends} months={-2} />);
    expect(screen.getByText('3ヶ月の成長')).toBeInTheDocument();

    // Fractional values are floored to the nearest positive integer.
    rerender(<GrowthTrendChart trends={trends} months={2.7} />);
    expect(screen.getByText('2ヶ月の成長')).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === '直近2ヶ月で 5 件'),
    ).toBeInTheDocument();
  });
});
