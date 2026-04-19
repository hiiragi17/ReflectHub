'use client';

import { useEffect, useState, type ReactNode, type ElementType, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type SlideDirection = 'top' | 'bottom' | 'left' | 'right';

export interface SlideInProps {
  children: ReactNode;
  direction?: SlideDirection;
  duration?: number;
  delay?: number;
  distance?: number;
  className?: string;
  as?: ElementType;
}

const getOffset = (direction: SlideDirection, distance: number): string => {
  switch (direction) {
    case 'top':
      return `translate3d(0, -${distance}px, 0)`;
    case 'bottom':
      return `translate3d(0, ${distance}px, 0)`;
    case 'left':
      return `translate3d(-${distance}px, 0, 0)`;
    case 'right':
      return `translate3d(${distance}px, 0, 0)`;
  }
};

export function SlideIn({
  children,
  direction = 'bottom',
  duration = 400,
  delay = 0,
  distance = 16,
  className,
  as: Component = 'div',
}: SlideInProps) {
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

  const style: CSSProperties = prefersReducedMotion
    ? { transitionDuration: '0ms' }
    : {
        transitionDuration: `${duration}ms`,
        transform: visible ? 'translate3d(0, 0, 0)' : getOffset(direction, distance),
      };

  return (
    <Component
      className={cn(
        'transition-all ease-out motion-reduce:transition-none motion-reduce:opacity-100',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={style}
    >
      {children}
    </Component>
  );
}

export default SlideIn;
