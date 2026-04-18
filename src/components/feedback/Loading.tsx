import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingProps {
  message?: string;
  size?: LoadingSize;
  fullScreen?: boolean;
  className?: string;
}

const sizeClass: Record<LoadingSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

const textSizeClass: Record<LoadingSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function Loading({
  message,
  size = 'md',
  fullScreen = false,
  className,
}: LoadingProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-gray-600',
        className,
      )}
    >
      <Loader2
        aria-hidden="true"
        className={cn('animate-spin motion-reduce:animate-none text-gray-500', sizeClass[size])}
      />
      {message ? (
        <p className={cn('text-gray-600', textSizeClass[size])}>{message}</p>
      ) : (
        <span className="sr-only">読み込み中</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export default Loading;
