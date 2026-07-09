import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Szukaj…',
  className,
}: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-secondary/60" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-(--radius-input) border border-line bg-white pr-10 pl-11 text-[1rem] placeholder:text-text-secondary/60 focus:border-accent focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Wyczyść"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-text-secondary"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
