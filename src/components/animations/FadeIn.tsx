'use client';

import { useEffect, useState, type ReactNode, type ElementType } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface FadeInProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
  as?: ElementType;
}

export function FadeIn({
  children,
  duration = 300,
  delay = 0,
  className,
  as: Component = 'div',
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(() => prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [delay, prefersReducedMotion]);

  return (
    <Component
      className={cn(
        'transition-opacity ease-out motion-reduce:transition-none motion-reduce:opacity-100',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </Component>
  );
}

export default FadeIn;
