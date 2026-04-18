import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useBreakpoint, useIsMobile, useIsDesktop } from './useMediaQuery';

type Listener = (event: MediaQueryListEvent) => void;

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (type: 'change', cb: Listener) => void;
  removeEventListener: (type: 'change', cb: Listener) => void;
  dispatch: (matches: boolean) => void;
}

const createMock = (initial: boolean): MockMediaQueryList => {
  const listeners = new Set<Listener>();
  return {
    matches: initial,
    media: '',
    addEventListener: (_type, cb) => listeners.add(cb),
    removeEventListener: (_type, cb) => listeners.delete(cb),
    dispatch(matches: boolean) {
      this.matches = matches;
      listeners.forEach((cb) =>
        cb({ matches, media: this.media } as MediaQueryListEvent),
      );
    },
  };
};

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns current match state', () => {
    const mock = createMock(true);
    window.matchMedia = vi.fn().mockReturnValue(mock) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('updates when media query state changes', () => {
    const mock = createMock(false);
    window.matchMedia = vi.fn().mockReturnValue(mock) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => mock.dispatch(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes the listener on unmount', () => {
    const mock = createMock(false);
    const removeSpy = vi.spyOn(mock, 'removeEventListener');
    window.matchMedia = vi.fn().mockReturnValue(mock) as unknown as typeof window.matchMedia;

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useBreakpoint helpers', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('useBreakpoint uses min-width query for named breakpoint', () => {
    const mock = createMock(true);
    const spy = vi.fn().mockReturnValue(mock);
    window.matchMedia = spy as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useBreakpoint('md'));
    expect(spy).toHaveBeenCalledWith('(min-width: 768px)');
    expect(result.current).toBe(true);
  });

  it('useIsMobile is the inverse of md breakpoint', () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue(createMock(false)) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('useIsDesktop is true when lg matches', () => {
    window.matchMedia = vi
      .fn()
      .mockImplementation(() => createMock(true)) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });
});
