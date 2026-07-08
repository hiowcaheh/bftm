import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface text-text-secondary',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  error: 'bg-error-soft text-error',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
