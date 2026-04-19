import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ColCount = 1 | 2 | 3 | 4 | 5 | 6;
type GapSize = 2 | 3 | 4 | 6 | 8;

export interface ResponsiveGridProps {
  children: ReactNode;
  cols?: ColCount;
  smCols?: ColCount;
  mdCols?: ColCount;
  lgCols?: ColCount;
  xlCols?: ColCount;
  gap?: GapSize;
  className?: string;
  as?: 'div' | 'section' | 'ul';
}

const baseColClasses: Record<ColCount, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const smColClasses: Record<ColCount, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const mdColClasses: Record<ColCount, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const lgColClasses: Record<ColCount, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const xlColClasses: Record<ColCount, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

const gapClasses: Record<GapSize, string> = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

export default function ResponsiveGrid({
  children,
  cols = 1,
  smCols,
  mdCols,
  lgCols,
  xlCols,
  gap = 4,
  className,
  as: Component = 'div',
}: ResponsiveGridProps) {
  return (
    <Component
      className={cn(
        'grid',
        baseColClasses[cols],
        smCols && smColClasses[smCols],
        mdCols && mdColClasses[mdCols],
        lgCols && lgColClasses[lgCols],
        xlCols && xlColClasses[xlCols],
        gapClasses[gap],
        className,
      )}
    >
      {children}
    </Component>
  );
}
