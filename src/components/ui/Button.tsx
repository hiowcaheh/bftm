import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white active:bg-accent-hover disabled:bg-accent/40',
  secondary:
    'bg-surface text-text border border-line active:bg-line/60 disabled:text-text-secondary/50',
  ghost: 'bg-transparent text-accent active:bg-accent-soft disabled:text-text-secondary/50',
  destructive: 'bg-error text-white active:bg-error/80 disabled:bg-error/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-12 px-4 text-sm rounded-(--radius-input) gap-2',
  lg: 'h-13 px-5 text-base rounded-(--radius-input) gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'press inline-flex items-center justify-center font-semibold select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
