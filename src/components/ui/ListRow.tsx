import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Wiersz listy 56–64 px: ikona/avatar po lewej, wartość + chevron po prawej. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron = false,
  onClick,
  className,
}: ListRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left',
        onClick && 'press cursor-pointer active:bg-surface',
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-text-secondary">{subtitle}</div>
        )}
      </div>
      {trailing && (
        <div className="tabular-nums shrink-0 text-sm text-text-secondary">{trailing}</div>
      )}
      {chevron && <ChevronRight className="size-5 shrink-0 text-text-secondary/50" />}
    </Tag>
  );
}

/** Kontener listy z hairline separatorami. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'divide-y divide-line overflow-hidden rounded-(--radius-card) bg-white shadow-(--shadow-card)',
        className,
      )}
    >
      {children}
    </div>
  );
}
