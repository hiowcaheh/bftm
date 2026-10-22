import { useState } from 'react';
import { cn } from '@/lib/cn';
import { moneyWhole } from '@/lib/format';
import { useT } from '@/lib/i18n/context';

export interface BarGroup {
  key: string;
  /** pod słupkami: „T42” / „pn” */
  label: string;
  /** daty pod etykietą: „12–18.10” / „14.10” */
  sub: string;
  /** nagłówek karty szczegółów */
  title: string;
  revenue: number;
  labor: number;
  expenses: number;
  /** zawiera dzisiejszy dzień — domyślnie wybrany */
  current: boolean;
}

const H = 150;
// Te same barwy co wykres roku w Rezultacie: wypracowane = tekst, koszty = szary
const REV = 'var(--color-text)';
const COST = '#c9c9d1';

const kFormatter = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
/** „+13,6k” / „−3,4k” — zysk nad słupkiem */
const signedK = (v: number) => `${v >= 0 ? '+' : ''}${kFormatter.format(v / 1000)}k`;
const signedMoney = (v: number) => `${v >= 0 ? '+' : ''}${moneyWhole(v)}`;

/**
 * Przebieg okresu w stylu wykresu z Rezultatu: wypracowane vs koszty, nad
 * słupkami zysk. Kolumna = przycisk; szczegóły wybranej (domyślnie bieżącej)
 * pokazują się pod wykresem zamiast tooltipa.
 */
export function FinanceBars({ groups, mode }: { groups: BarGroup[]; mode: 'week' | 'month' }) {
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);

  const cost = (g: BarGroup) => g.labor + g.expenses;
  const filled = groups.filter((g) => g.revenue > 0 || cost(g) > 0);
  const sel =
    filled.find((g) => g.key === picked) ??
    filled.find((g) => g.current) ??
    filled[filled.length - 1] ??
    null;

  const max = Math.max(1, ...groups.map((g) => Math.max(g.revenue, cost(g))));
  const h = (v: number) => Math.max(2, (v / max) * H);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t('fin.chartAria')} className="-mx-2 flex">
        {groups.map((g) => {
          const empty = !filled.includes(g);
          const profit = g.revenue - cost(g);
          const on = g === sel;
          return (
            <button
              key={g.key}
              type="button"
              disabled={empty}
              aria-pressed={on}
              aria-label={`${g.title}: ${empty ? t('fin.noDataGroup') : `${t('fin.profitShort')} ${signedMoney(profit)}`}`}
              onClick={() => setPicked(g.key)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl pt-2 pb-1.5',
                on && 'bg-bg',
                !empty && 'press',
              )}
            >
              <span
                className={cn(
                  'tabular-nums h-4 text-[12px] leading-4 font-bold whitespace-nowrap',
                  profit >= 0 ? 'text-success' : 'text-error',
                )}
              >
                {!empty && signedK(profit)}
              </span>
              <div className="flex items-end gap-1" style={{ height: H }}>
                {empty ? (
                  <span className="h-0.5 w-[26px] rounded-full bg-line" />
                ) : (
                  <>
                    <span
                      className="w-[15px] rounded-t-[4px] rounded-b-[2px]"
                      style={{ height: h(g.revenue), background: REV }}
                    />
                    <span
                      className="w-[15px] rounded-t-[4px] rounded-b-[2px]"
                      style={{ height: h(cost(g)), background: COST }}
                    />
                  </>
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-semibold capitalize',
                  on ? 'text-text' : 'text-text-secondary',
                )}
              >
                {g.label}
              </span>
              <span className="tabular-nums -mt-1 text-[11px] whitespace-nowrap text-text-secondary">
                {g.sub}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Legend color={REV}>{t('fin.earned')}</Legend>
          <Legend color={COST}>{t('fin.costs')}</Legend>
        </div>
        <p className="text-xs leading-snug text-text-secondary">
          {t('fin.chartNoteA')}{' '}
          <b className="text-success">
            {t(mode === 'week' ? 'fin.chartProfitDay' : 'fin.chartProfitWeek')}
          </b>
          . {t(mode === 'week' ? 'fin.chartTapDay' : 'fin.chartTapWeek')}
        </p>
      </div>

      {sel && (
        <div className="tabular-nums flex flex-col gap-1.5 rounded-xl bg-bg px-3.5 py-3 text-sm">
          <p className="text-xs font-semibold text-text-secondary first-letter:uppercase">
            {sel.title}
          </p>
          <div className="flex justify-between gap-3">
            <span>{t('fin.earned')}</span>
            <span className="font-semibold">{moneyWhole(sel.revenue)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>{t('fin.costs')}</span>
            <span className="font-semibold">{moneyWhole(cost(sel))}</span>
          </div>
          <p className="-mt-1 text-xs text-text-secondary">
            {t('fin.costsSub', { labor: moneyWhole(sel.labor), exp: moneyWhole(sel.expenses) })}
          </p>
          <div className="flex justify-between gap-3 border-t border-line pt-1.5">
            <span className="font-semibold">{t('fin.profitShort')}</span>
            <span
              className={cn(
                'font-bold',
                sel.revenue - cost(sel) >= 0 ? 'text-success' : 'text-error',
              )}
            >
              {signedMoney(sel.revenue - cost(sel))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Próbka w kształcie słupka — jak legenda w Rezultacie */
function Legend({ color, children }: { color: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i
        className="inline-block h-4 w-[9px] rounded-t-[3px] rounded-b-[1px]"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}
