import { cn } from '@/lib/cn';

/** Placeholder ładowania — używany WYŁĄCZNIE przy pierwszym pobraniu w życiu aplikacji. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-line/60', className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-(--radius-card)" />
      ))}
    </div>
  );
}
