import { cn } from '@/lib/cn';

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 rounded-(--radius-input) bg-surface p-1', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-9 flex-1 rounded-lg text-xs font-medium transition-colors duration-150',
            value === opt.value
              ? 'bg-white text-text shadow-(--shadow-card)'
              : 'text-text-secondary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
