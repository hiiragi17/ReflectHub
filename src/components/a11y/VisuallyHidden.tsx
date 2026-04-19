import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface VisuallyHiddenProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  className,
}: VisuallyHiddenProps) {
  return <Component className={cn('sr-only', className)}>{children}</Component>;
}

export default VisuallyHidden;
