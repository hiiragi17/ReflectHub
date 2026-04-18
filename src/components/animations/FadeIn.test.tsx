import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FadeIn } from './FadeIn';

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

describe('FadeIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(<FadeIn>hello</FadeIn>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('starts fully transparent and becomes visible after mount', () => {
    render(
      <FadeIn>
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.className).toContain('opacity-0');
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(wrapper.className).toContain('opacity-100');
  });

  it('respects the delay prop before becoming visible', () => {
    render(
      <FadeIn delay={500}>
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.className).toContain('opacity-0');
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(wrapper.className).toContain('opacity-0');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(wrapper.className).toContain('opacity-100');
  });

  it('applies custom duration via inline style', () => {
    render(
      <FadeIn duration={750}>
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.style.transitionDuration).toBe('750ms');
  });

  it('renders as the supplied element when "as" is provided', () => {
    render(
      <FadeIn as="section" className="my-cls">
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.tagName).toBe('SECTION');
    expect(wrapper.className).toContain('my-cls');
  });

  it('includes motion-reduce class for prefers-reduced-motion', () => {
    render(
      <FadeIn>
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.className).toContain('motion-reduce:transition-none');
    expect(wrapper.className).toContain('motion-reduce:opacity-100');
  });

  it('renders content visible immediately when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    render(
      <FadeIn delay={500}>
        <span data-testid="child">child</span>
      </FadeIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.className).toContain('opacity-100');
    expect(wrapper.className).not.toContain('opacity-0');
  });
});
