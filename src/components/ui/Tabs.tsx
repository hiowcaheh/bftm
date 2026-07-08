import { cn } from '@/lib/cn';

interface TabsProps<T extends string> {
  tabs: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Poziome zakładki (np. w szczegółach projektu), przewijane przy nadmiarze. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative h-11 shrink-0 px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150',
              active ? 'text-accent' : 'text-text-secondary',
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
