'use client';

import { useEffect, useState, type ReactNode, type ElementType } from 'react';
import { cn } from '@/lib/utils';

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [delay]);

  return (
    <Component
      className={cn(
        'transition-opacity ease-out motion-reduce:transition-none',
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
