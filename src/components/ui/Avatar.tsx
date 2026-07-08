import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
