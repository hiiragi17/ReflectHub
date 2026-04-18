import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PeriodComparison from './PeriodComparison';

describe('PeriodComparison', () => {
  it('renders current and previous values', () => {
    render(
      <PeriodComparison
        title="前月比"
        currentLabel="今月"
        previousLabel="先月"
        data={{ current: 8, previous: 4, change: 4, changeRate: 100 }}
      />,
    );
    expect(screen.getByText('前月比')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('+4 件')).toBeInTheDocument();
    expect(screen.getByText('(+100%)')).toBeInTheDocument();
  });

  it('shows zero-change state', () => {
    render(
      <PeriodComparison
        title="前週比"
        currentLabel="今週"
        previousLabel="先週"
        data={{ current: 2, previous: 2, change: 0, changeRate: 0 }}
      />,
    );
    expect(screen.getByText('0 件')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });
});
