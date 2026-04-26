import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ThisWeekStatusCard from './ThisWeekStatus';

describe('ThisWeekStatus', () => {
  it('renders recorded state with this-week count and no CTA', () => {
    render(
      <ThisWeekStatusCard status={{ recorded: true, thisWeekCount: 2 }} />,
    );

    expect(screen.getByText('今週の状況')).toBeInTheDocument();
    expect(screen.getByText('記録済 (2件)')).toBeInTheDocument();
    expect(screen.getByText('今週の振り返りはバッチリです。')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /振り返りを書く/ })).not.toBeInTheDocument();
  });

  it('renders unrecorded state with helper text and CTA linking to /reflection', () => {
    render(
      <ThisWeekStatusCard status={{ recorded: false, thisWeekCount: 0 }} />,
    );

    expect(screen.getByText('未記録')).toBeInTheDocument();
    expect(
      screen.getByText('今週はまだ振り返りが記録されていません。'),
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /振り返りを書く/ });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/reflection');
  });

  it('respects custom reflectionHref', () => {
    render(
      <ThisWeekStatusCard
        status={{ recorded: false, thisWeekCount: 0 }}
        reflectionHref="/reflection?framework=ywt"
      />,
    );
    const cta = screen.getByRole('link', { name: /振り返りを書く/ });
    expect(cta).toHaveAttribute('href', '/reflection?framework=ywt');
  });
});
