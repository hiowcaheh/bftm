import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FABProps {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
  className?: string;
}

/** Pływający przycisk akcji kontekstowej — nad dolnym paskiem nawigacji. */
export function FAB({ onClick, label, icon, className }: FABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'press fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-(--shadow-fab) active:bg-accent-hover',
        className,
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      {icon ?? <Plus className="size-7" />}
    </button>
  );
}
