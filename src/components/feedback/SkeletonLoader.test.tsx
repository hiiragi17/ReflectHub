import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders a single skeleton with status role', () => {
    render(<SkeletonLoader />);
    const node = screen.getByRole('status');
    expect(node).toHaveAttribute('aria-busy', 'true');
    expect(node).toHaveAttribute('aria-label', '読み込み中');
    expect(node.className).toContain('animate-pulse');
  });

  it('applies the rectangle variant class', () => {
    render(<SkeletonLoader variant="rectangle" data-testid="sk" />);
    const node = screen.getByRole('status');
    expect(node.className).toContain('rounded-md');
  });

  it('applies the circle variant class', () => {
    render(<SkeletonLoader variant="circle" />);
    const node = screen.getByRole('status');
    expect(node.className).toContain('rounded-full');
  });

  it('renders width/height as inline styles', () => {
    render(<SkeletonLoader width={120} height="2rem" />);
    const node = screen.getByRole('status');
    expect((node as HTMLElement).style.width).toBe('120px');
    expect((node as HTMLElement).style.height).toBe('2rem');
  });

  it('renders multiple lines when count > 1', () => {
    render(<SkeletonLoader count={3} />);
    const wrapper = screen.getByRole('status');
    const lines = wrapper.querySelectorAll('[aria-hidden="true"]');
    expect(lines.length).toBe(3);
  });

  it('treats invalid count values as a single skeleton', () => {
    render(<SkeletonLoader count={0} />);
    const wrapper = screen.getByRole('status');
    expect(wrapper.className).toContain('animate-pulse');
  });

  it('treats Infinity count as a single skeleton without throwing', () => {
    expect(() =>
      render(<SkeletonLoader count={Number.POSITIVE_INFINITY} />),
    ).not.toThrow();
    const wrapper = screen.getByRole('status');
    expect(wrapper.className).toContain('animate-pulse');
  });

  it('caps very large count values to avoid runaway rendering', () => {
    render(<SkeletonLoader count={9999} />);
    const wrapper = screen.getByRole('status');
    const lines = wrapper.querySelectorAll('[aria-hidden="true"]');
    expect(lines.length).toBeLessThanOrEqual(50);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('includes motion-reduce class for reduced-motion users', () => {
    render(<SkeletonLoader />);
    const node = screen.getByRole('status');
    expect(node.className).toContain('motion-reduce:animate-none');
  });
});
