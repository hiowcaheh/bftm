import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  message: string;
  action?: ReactNode;
}

/** Pusty stan: ikona + jedno zdanie + opcjonalny przycisk CTA. */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-surface">
        <Icon className="size-8 text-text-secondary/60" />
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
