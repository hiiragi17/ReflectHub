import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
  sidebarWidth?: 'sm' | 'md' | 'lg';
  className?: string;
  stickyBreakpoint?: 'md' | 'lg';
  sidebarAriaLabel?: string;
  rightPanelAriaLabel?: string;
}

const sidebarWidthClasses: Record<NonNullable<SidebarLayoutProps['sidebarWidth']>, string> = {
  sm: 'md:w-56 lg:w-60',
  md: 'md:w-64 lg:w-72',
  lg: 'md:w-72 lg:w-80',
};

const stickyTopClass = 'md:sticky md:top-20';

export default function SidebarLayout({
  sidebar,
  children,
  rightPanel,
  sidebarWidth = 'md',
  className,
  stickyBreakpoint = 'md',
  sidebarAriaLabel = 'サイドバー',
  rightPanelAriaLabel = '関連情報パネル',
}: SidebarLayoutProps) {
  const stickyClass =
    stickyBreakpoint === 'md' ? stickyTopClass : 'lg:sticky lg:top-20';

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row gap-6 w-full',
        className,
      )}
    >
      <aside
        aria-label={sidebarAriaLabel}
        className={cn(
          'w-full shrink-0',
          sidebarWidthClasses[sidebarWidth],
          stickyClass,
          'md:self-start',
        )}
      >
        {sidebar}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
      {rightPanel && (
        <aside
          aria-label={rightPanelAriaLabel}
          className="w-full md:w-64 lg:w-80 shrink-0 lg:self-start lg:sticky lg:top-20"
        >
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
