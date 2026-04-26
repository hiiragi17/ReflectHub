import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ThisWeekStatusCard from './ThisWeekStatus';

describe('ThisWeekStatus', () => {
  it('renders recorded state with this-week count and no CTA', () => {
    render(
      <ThisWeekStatusCard
        status={{
          recorded: true,
          thisWeekCount: 2,
          totalActiveWeeks: 28,
          currentWeeklyStreak: 5,
        }}
      />,
    );

    expect(screen.getByText('今週の状況')).toBeInTheDocument();
    expect(screen.getByText('記録済 (2件)')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    // Streak suffix should NOT appear when this week is recorded
    expect(screen.queryByText('週（先週まで）')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /振り返りを書く/ })).not.toBeInTheDocument();
  });

  it('renders unrecorded state with CTA and shows "（先週まで）" suffix when streak carries over', () => {
    render(
      <ThisWeekStatusCard
        status={{
          recorded: false,
          thisWeekCount: 0,
          totalActiveWeeks: 28,
          currentWeeklyStreak: 5,
        }}
      />,
    );

    expect(screen.getByText('未記録')).toBeInTheDocument();
    expect(screen.getByText('週（先週まで）')).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /振り返りを書く/ });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/reflection');
  });

  it('omits "（先週まで）" suffix when streak is zero', () => {
    render(
      <ThisWeekStatusCard
        status={{
          recorded: false,
          thisWeekCount: 0,
          totalActiveWeeks: 0,
          currentWeeklyStreak: 0,
        }}
      />,
    );

    expect(screen.getByText('未記録')).toBeInTheDocument();
    expect(screen.queryByText('週（先週まで）')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /振り返りを書く/ })).toBeInTheDocument();
  });

  it('respects custom reflectionHref', () => {
    render(
      <ThisWeekStatusCard
        status={{
          recorded: false,
          thisWeekCount: 0,
          totalActiveWeeks: 1,
          currentWeeklyStreak: 1,
        }}
        reflectionHref="/reflection?framework=ywt"
      />,
    );
    const cta = screen.getByRole('link', { name: /振り返りを書く/ });
    expect(cta).toHaveAttribute('href', '/reflection?framework=ywt');
  });
});
