import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'text' | 'rectangle' | 'circle';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const variantClass: Record<SkeletonVariant, string> = {
  text: 'rounded h-4',
  rectangle: 'rounded-md',
  circle: 'rounded-full',
};

const toCssSize = (value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
};

export function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className,
  count = 1,
}: SkeletonLoaderProps) {
  const MAX_SKELETONS = 50;
  const normalized = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const safeCount = Math.min(MAX_SKELETONS, normalized);

  const style: CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
  };

  if (safeCount === 1) {
    return (
      <span
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="読み込み中"
        className={cn(
          'block bg-gray-200 animate-pulse motion-reduce:animate-none',
          variantClass[variant],
          className,
        )}
        style={style}
      />
    );
  }

  return (
    <span
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="読み込み中"
      className="block space-y-2"
    >
      {Array.from({ length: safeCount }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'block bg-gray-200 animate-pulse motion-reduce:animate-none',
            variantClass[variant],
            className,
          )}
          style={style}
        />
      ))}
    </span>
  );
}

export default SkeletonLoader;
