import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  href?: string;
  children?: ReactNode;
  className?: string;
}

export function SkipLink({
  href = '#main-content',
  children = 'メインコンテンツへスキップ',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus-visible:not-sr-only',
        'focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50',
        'focus-visible:px-4 focus-visible:py-2',
        'focus-visible:bg-blue-600 focus-visible:text-white',
        'focus-visible:rounded-md focus-visible:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600',
        className,
      )}
    >
      {children}
    </a>
  );
}

export default SkipLink;
