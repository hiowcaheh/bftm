import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/context';
import type { MonthStat, YearStat } from '../analysis';

export type Metric = 'money' | 'result' | 'hours';

const H = 150;
const REV = 'var(--color-text)';
const COST = '#c9c9d1';
const OK = 'var(--color-success)';
// prognoza: delikatne czerwone kreski (akcent aplikacji), ta sama barwa co „~liczba"
const hatch = (alpha: number) =>
  `repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in srgb, var(--color-accent) ${alpha}%, transparent) 3px 5px)`;

const k = (v: number) => `${Math.round(v / 1000)}k`;

/**
 * Wykres roku sty–gru na całą szerokość, przewijany w bok. Słupek = przycisk:
 * klik wybiera miesiąc (analiza pokazuje się pod wykresem). Bieżący miesiąc
 * ma dorysowaną kreskowaną prognozę i jej wartość „~" nad słupkiem.
 */
export function YearChart({
  stat,
  metric,
  selected,
  onSelect,
  monthLabel,
}: {
  stat: YearStat;
  metric: Metric;
  selected: number | null;
  onSelect: (m: number) => void;
  monthLabel: (m: number) => string;
}) {
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);

  // wybrany miesiąc na środek przewijanego wykresu
  useEffect(() => {
    const box = boxRef.current;
    const col = box?.querySelector<HTMLElement>(`[data-m="${selected}"]`);
    if (box && col) box.scrollLeft = col.offsetLeft - box.clientWidth / 2 + col.offsetWidth / 2;
  }, [selected, stat.year]);

  const value = (x: MonthStat) =>
    metric === 'money' ? x.revenue : metric === 'result' ? x.result : x.hours;
  const projected = (x: MonthStat) =>
    !x.live ? null : metric === 'money' ? x.live.revenue : metric === 'result' ? x.live.result : x.live.hours;
  const max = Math.max(
    1,
    ...stat.months.map((x) => (x ? Math.max(value(x), projected(x) ?? 0) : 0)),
  );
  const h = (v: number) => Math.max(2, (Math.max(0, v) / max) * H);

  // strong = słupek główny (pełna ramka), inaczej koszty (bledsza ramka i kreski)
  const bar = (v: number, proj: number | null, color: string, width: number, strong: boolean) => (
    <div className="flex flex-col-reverse" style={{ width }}>
      <div className="rounded-t-[4px] rounded-b-[2px]" style={{ height: h(v), background: color }} />
      {proj !== null && proj > v && (
        <div
          className="rounded-t-[4px] border-[1.5px] border-b-0 border-dashed"
          style={{
            height: ((proj - v) / max) * H,
            background: hatch(strong ? 25 : 12),
            borderColor: strong ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
          }}
        />
      )}
    </div>
  );

  return (
    <>
      <div ref={boxRef} className="-mx-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max px-2.5">
          {stat.months.map((x, i) => {
            const m = i + 1;
            const on = !!x && selected === m;
            const proj = x ? projected(x) : null;
            let label: string | null = null;
            let fc: string | null = null;
            if (x) {
              if (metric === 'hours') {
                label = `${Math.round(x.hours)} h`;
                fc = x.live ? `~ ${x.live.hours} h` : null;
              } else {
                // nad słupkami pieniędzy i wyniku zawsze wynik miesiąca
                label = `${x.result >= 0 && metric === 'money' ? '+' : ''}${k(x.result)}`;
                fc = x.live ? `~ ${metric === 'money' ? '+' : ''}${k(x.live.result)}` : null;
              }
            }
            return (
              <button
                key={m}
                type="button"
                data-m={m}
                disabled={!x}
                aria-pressed={on}
                onClick={() => x && onSelect(m)}
                className={cn(
                  'flex w-[62px] flex-none flex-col items-center gap-1.5 rounded-xl pt-2 pb-1.5',
                  on && 'bg-bg',
                  x && 'press',
                )}
              >
                <span className="tabular-nums flex h-7 flex-col items-center justify-end text-[10.5px] leading-tight font-bold whitespace-nowrap">
                  {fc && <span className="text-accent">{fc}</span>}
                  {label && (
                    <span className={metric === 'hours' ? 'text-text' : x!.result >= 0 ? 'text-success' : 'text-error'}>
                      {label}
                    </span>
                  )}
                </span>
                <div className="flex items-end gap-1" style={{ height: H }}>
                  {!x && <span className="h-0.5 w-[26px] rounded-full bg-line" />}
                  {x && metric === 'money' && (
                    <>
                      {bar(x.revenue, x.live?.revenue ?? null, REV, 15, true)}
                      {bar(x.cost, x.live?.cost ?? null, COST, 15, false)}
                    </>
                  )}
                  {x && metric === 'result' && bar(x.result, proj, x.result >= 0 ? OK : 'var(--color-error)', 26, true)}
                  {x && metric === 'hours' && bar(x.hours, proj, REV, 26, true)}
                </div>
                <span className={cn('text-xs font-semibold capitalize', on ? 'text-text' : 'text-text-secondary')}>
                  {monthLabel(m)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* legenda: próbki w kształcie słupków + jedno zdanie o liczbach nad słupkami */}
      <div className="flex flex-col gap-2 border-t border-line pt-2.5">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
          {metric === 'money' && (
            <>
              <Legend color={REV}>{t('res.legendRevenue')}</Legend>
              <Legend color={COST}>{t('res.legendCosts')}</Legend>
            </>
          )}
          {metric === 'result' && <Legend color={OK}>{t('res.legendResultShort')}</Legend>}
          {metric === 'hours' && <Legend color={REV}>{t('res.legendHoursShort')}</Legend>}
          <Legend forecast>{t('res.legendForecastShort')}</Legend>
        </div>
        <p className="text-[11.5px] leading-snug text-text-secondary">
          {t('res.legendNoteA')}{' '}
          <b className={metric === 'hours' ? 'text-text' : 'text-success'}>
            {t(metric === 'hours' ? 'res.legendNoteHours' : 'res.legendNoteResult')}
          </b>
          {t('res.legendNoteB')} <b className="text-accent">~</b> {t('res.legendNoteC')}
        </p>
      </div>
    </>
  );
}

function Legend({ color, forecast, children }: { color?: string; forecast?: boolean; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i
        className={cn(
          'inline-block h-4 w-[9px] rounded-t-[3px] rounded-b-[1px]',
          forecast && 'border-[1.5px] border-dashed border-accent',
        )}
        style={forecast ? { background: hatch(25) } : { background: color }}
      />
      {children}
    </span>
  );
}
