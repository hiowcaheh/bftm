import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-(--radius-card) bg-white shadow-(--shadow-card)',
        interactive && 'press cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
}
