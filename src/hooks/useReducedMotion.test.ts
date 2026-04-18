import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

const createMock = (matches: boolean) => ({
  matches,
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('useReducedMotion', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => createMock(false)) as unknown as typeof window.matchMedia;
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion is reduce', () => {
    window.matchMedia = vi.fn(() => createMock(true)) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('subscribes to the prefers-reduced-motion media query', () => {
    const mock = createMock(false);
    window.matchMedia = vi.fn(() => mock) as unknown as typeof window.matchMedia;
    renderHook(() => useReducedMotion());
    expect(mock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
