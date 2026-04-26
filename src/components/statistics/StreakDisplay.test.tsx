import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakDisplay from './StreakDisplay';

describe('StreakDisplay', () => {
  it('renders weekly streak labels and values with 週 unit', () => {
    render(
      <StreakDisplay
        streak={{ currentStreak: 5, bestStreak: 12, totalActiveWeeks: 28 }}
      />,
    );

    expect(screen.getByText('ストリーク（週単位）')).toBeInTheDocument();
    expect(screen.getByText('連続記録週数')).toBeInTheDocument();
    expect(screen.getByText('ベスト連続週数')).toBeInTheDocument();
    expect(screen.getByText('総振り返り週数')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    // 週 unit appears once per item
    expect(screen.getAllByText('週')).toHaveLength(3);
  });

  it('renders zeros for empty streak', () => {
    render(
      <StreakDisplay
        streak={{ currentStreak: 0, bestStreak: 0, totalActiveWeeks: 0 }}
      />,
    );
    expect(screen.getAllByText('0')).toHaveLength(3);
  });
});
