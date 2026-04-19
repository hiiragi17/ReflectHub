'use client';

import { useEffect, useState } from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const buildMinWidthQuery = (px: number): string => `(min-width: ${px}px)`;

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
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
