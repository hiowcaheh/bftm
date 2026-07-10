import { useMemo, useState } from 'react';
import { money } from '@/lib/format';

export interface BarGroup {
  key: string;
  label: string;
  revenue: number;
  cost: number;
}

/** Paleta wykresów zwalidowana (CVD ΔE 95): przychód niebieski, koszty w akcencie. */
export const CHART_REVENUE = '#2A78D6';
export const CHART_COST = '#CC0000';

const H = 160;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
const PAD_LEFT = 34;
const PAD_RIGHT = 4;

/** Zaokrąglenie osi do „ładnej" wartości: 1/2/2,5/5 × 10^n. */
function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (value <= m * exp) return m * exp;
  }
  return 10 * exp;
}

const compact = (v: number) =>
  v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));

/** Słupek rosnący od linii bazowej: góra zaokrąglona 4px, dół prosty. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Wykres słupkowy przychód vs koszty. Tapnięcie w grupę pokazuje
 * dokładne kwoty pod wykresem (mobile-first zamiast tooltipa).
 */
export function FinanceBars({ groups }: { groups: BarGroup[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const width = 360;
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const max = useMemo(
    () => niceMax(Math.max(...groups.map((g) => Math.max(g.revenue, g.cost)), 0)),
    [groups],
  );
  const y = (v: number) => PAD_TOP + plotH - (v / max) * plotH;

  const slot = plotW / Math.max(groups.length, 1);
  const barW = Math.min(24, Math.max(6, (slot - 8) / 2));
  const sel = groups.find((g) => g.key === selected) ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_REVENUE }} />
          Przychód
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COST }} />
          Koszty
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${H}`}
        className="w-full"
        role="img"
        aria-label="Wykres przychodów i kosztów"
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6}
              y={y(max * t) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--color-text-secondary)"
              className="tabular-nums"
            >
              {compact(max * t)}
            </text>
          </g>
        ))}

        {groups.map((g, i) => {
          const cx = PAD_LEFT + slot * i + slot / 2;
          const rH = ((g.revenue / max) * plotH) || 0;
          const cH = ((g.cost / max) * plotH) || 0;
          const dim = selected !== null && selected !== g.key;
          return (
            <g
              key={g.key}
              opacity={dim ? 0.35 : 1}
              onClick={() => setSelected(selected === g.key ? null : g.key)}
            >
              {/* niewidoczny cel dotyku na całą kolumnę */}
              <rect
                x={PAD_LEFT + slot * i}
                y={PAD_TOP}
                width={slot}
                height={plotH + PAD_BOTTOM}
                fill="transparent"
              />
              <path
                d={barPath(cx - barW - 1, y(g.revenue), barW, rH)}
                fill={CHART_REVENUE}
              />
              <path d={barPath(cx + 1, y(g.cost), barW, cH)} fill={CHART_COST} />
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-text-secondary)"
              >
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>

      {sel && (
        <p className="tabular-nums rounded-xl bg-surface px-3 py-2 text-xs">
          <span className="font-semibold">{sel.label}</span> — przychód{' '}
          {money(sel.revenue)}, koszty {money(sel.cost)}
        </p>
      )}
    </div>
  );
}
