import { cn } from '@/lib/cn';

export interface Delta {
  text: string;
  tone: 'up' | 'down' | 'flat';
}

/**
 * Zmiana względem poprzedniego okresu. `higherIsBetter=false` dla kosztów —
 * wzrost kosztów jest „gorzej" (czerwony). Brak danych z poprzedniego okresu
 * albo zero → brak plakietki (procent od zera nic nie mówi).
 */
export function delta(cur: number, prev: number | undefined, higherIsBetter = true): Delta | null {
  if (prev === undefined || Math.abs(prev) < 0.5) return null;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return { text: '0%', tone: 'flat' };
  const better = higherIsBetter ? pct > 0 : pct < 0;
  return { text: `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}%`, tone: better ? 'up' : 'down' };
}

/** Plakietka z procentem + „vs 1–21 wrz" pod kwotą w kafelku Finansów. */
export function DeltaLine({ delta: d, label }: { delta: Delta | null; label: string }) {
  if (!d) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'tabular-nums rounded-full px-1.5 py-px text-[10.5px] font-bold',
          d.tone === 'up' && 'bg-success-soft text-success',
          d.tone === 'down' && 'bg-error-soft text-error',
          d.tone === 'flat' && 'bg-surface text-text-secondary',
        )}
      >
        {d.text}
      </span>
      <span className="text-[11px] text-text-secondary">{label}</span>
    </span>
  );
}
