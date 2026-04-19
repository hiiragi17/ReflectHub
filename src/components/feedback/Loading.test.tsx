import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading } from './Loading';

describe('Loading', () => {
  it('renders a status region with default sr-only label', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('読み込み中')).toBeInTheDocument();
  });

  it('renders the supplied message', () => {
    render(<Loading message="データを取得中..." />);
    expect(screen.getByText('データを取得中...')).toBeInTheDocument();
  });

  it('applies the spinner size class for large variant', () => {
    const { container } = render(<Loading size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-10');
    expect(svg?.getAttribute('class')).toContain('h-10');
  });

  it('renders a fixed full-screen overlay when fullScreen is true', () => {
    const { container } = render(<Loading fullScreen message="読み込み" />);
    const overlay = container.querySelector('div.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('honours motion-reduce on the spinner', () => {
    const { container } = render(<Loading />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('motion-reduce:animate-none');
  });
});
