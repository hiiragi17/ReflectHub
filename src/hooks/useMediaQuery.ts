'use client';

import { useCallback, useSyncExternalStore } from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const buildMinWidthQuery = (px: number): string => `(min-width: ${px}px)`;

const canMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (canMatchMedia() ? window.matchMedia(query).matches : false),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  return useMediaQuery(buildMinWidthQuery(BREAKPOINTS[breakpoint]));
};

export const useIsMobile = (): boolean => !useBreakpoint('md');
export const useIsTablet = (): boolean => {
  const isMdUp = useBreakpoint('md');
  const isLgUp = useBreakpoint('lg');
  return isMdUp && !isLgUp;
};
export const useIsDesktop = (): boolean => useBreakpoint('lg');
