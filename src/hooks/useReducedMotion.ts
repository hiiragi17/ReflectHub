'use client';

import { useMediaQuery } from './useMediaQuery';

const QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = (): boolean => useMediaQuery(QUERY);

export default useReducedMotion;
