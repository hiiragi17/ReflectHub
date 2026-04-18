import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SlideIn } from './SlideIn';

describe('SlideIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(<SlideIn>hello</SlideIn>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('starts off-screen and animates to translate(0,0)', () => {
    render(
      <SlideIn direction="bottom" distance={20}>
        <span data-testid="child">child</span>
      </SlideIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.style.transform).toBe('translate3d(0, 20px, 0)');
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(wrapper.style.transform).toBe('translate3d(0, 0, 0)');
  });

  it.each([
    ['top', 'translate3d(0, -16px, 0)'],
    ['bottom', 'translate3d(0, 16px, 0)'],
    ['left', 'translate3d(-16px, 0, 0)'],
    ['right', 'translate3d(16px, 0, 0)'],
  ] as const)('uses correct initial offset for direction "%s"', (direction, expected) => {
    render(
      <SlideIn direction={direction}>
        <span data-testid="child">child</span>
      </SlideIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.style.transform).toBe(expected);
  });

  it('honours the delay prop', () => {
    render(
      <SlideIn delay={300} direction="left">
        <span data-testid="child">child</span>
      </SlideIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.style.transform).toBe('translate3d(-16px, 0, 0)');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(wrapper.style.transform).toBe('translate3d(-16px, 0, 0)');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(wrapper.style.transform).toBe('translate3d(0, 0, 0)');
  });

  it('applies motion-reduce classes', () => {
    render(
      <SlideIn>
        <span data-testid="child">child</span>
      </SlideIn>,
    );
    const wrapper = screen.getByTestId('child').parentElement!;
    expect(wrapper.className).toContain('motion-reduce:transition-none');
    expect(wrapper.className).toContain('motion-reduce:transform-none');
  });
});
