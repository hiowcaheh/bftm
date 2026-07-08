import { cn } from '@/lib/cn';

interface ChipsProps<T extends string> {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T | null;
  onChange: (value: T | null) => void;
  className?: string;
}

/** Poziomo przewijane chipsy filtrów; tap w aktywny chip zdejmuje filtr. */
export function Chips<T extends string>({ options, value, onChange, className }: ChipsProps<T>) {
  return (
    <div className={cn('no-scrollbar flex gap-2 overflow-x-auto', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : opt.value)}
            className={cn(
              'press h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap',
              active
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-white text-text-secondary',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn('ml-1.5', active ? 'text-white/80' : 'text-text-secondary/60')}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
