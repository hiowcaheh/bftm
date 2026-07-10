import { moneyWhole } from '@/lib/format';

export interface DonutSlice {
  id: string;
  name: string;
  color: string;
  value: number;
}

const R = 54;
const STROKE = 18;
const C = 2 * Math.PI * R;

/**
 * Donut udziału kosztów (kolory projektów = tożsamość; wartości w legendzie,
 * więc kolor nigdy nie jest jedynym nośnikiem informacji).
 */
export function CostDonut({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;

  const gap = slices.length > 1 ? 2.5 : 0; // odstęp w px łuku między segmentami
  let offset = 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto size-40">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          {slices.map((s) => {
            const len = Math.max((s.value / total) * C - gap, 0);
            const el = (
              <circle
                key={s.id}
                cx={70}
                cy={70}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len + gap;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold">{moneyWhole(total)}</span>
          <span className="text-[11px] text-text-secondary">koszty okresu</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {slices.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="tabular-nums text-text-secondary">
              {Math.round((s.value / total) * 100)}%
            </span>
            <span className="tabular-nums w-24 text-right font-medium">
              {moneyWhole(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
