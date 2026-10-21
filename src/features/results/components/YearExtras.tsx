import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/cn';
import { moneyWhole } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import type { YearExtra } from '../analysis';

/** Prognoza zysku na koniec roku — spokojnie: zielona kreska z boku, bez ramki. */
export function YearForecast({ forecast, compact }: { forecast: YearExtra['forecast']; compact: Intl.NumberFormat }) {
  const { t } = useI18n();
  if (!forecast) return null;
  const sign = forecast.result >= 0 ? '+' : '−';
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-success/50 pl-2.5">
      <span className="text-xs text-text-secondary">{t('res.yForecastTitle')}</span>
      <span className="tabular-nums text-[17px] font-bold text-success">
        ~ {sign}
        {compact.format(Math.abs(forecast.result))} kr{' '}
        <span className="text-sm font-semibold">{t('res.yForecastProfit')}</span>
      </span>
      <p className="text-[11.5px] leading-snug text-text-secondary/80">
        {t('res.yForecastWhy', { avg: `${compact.format(Math.round(forecast.avg))} kr` })}
      </p>
    </div>
  );
}

/** Pieniądze, godzina pracy i projekty roku — sekcje w karcie „Wynik". */
export function YearExtras({
  extra,
  year,
  compact,
  hours,
}: {
  extra: YearExtra;
  year: number;
  compact: Intl.NumberFormat;
  hours: (n: number) => string;
}) {
  const { t, tp, dateLocale } = useI18n();
  const { money, perHour, projects } = extra;
  const kr = (n: number) => `${compact.format(n)}`;

  const statusParts = (['active', 'completed', 'paused'] as const)
    .filter((s) => projects.byStatus[s])
    .map((s) => t(`res.st_${s}`, { n: projects.byStatus[s]! }));

  return (
    <>
      <Divider />
      <Cap>{t('res.moneyTitle', { year })}</Cap>
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t('res.invoiced')} value={kr(money.sent)} hint={t('res.invoicedHint')} />
        <Tile label={t('res.paidIn')} value={kr(money.paid)} hint={t('res.paidYearHint')} tone="ok" />
        <Tile
          label={t('res.waiting')}
          value={kr(money.waiting)}
          hint={money.overdue > 0 ? t('res.waitingOverdue', { v: kr(money.overdue) }) : t('res.waitingOk')}
        />
      </div>
      <p className="text-[12.5px] leading-snug text-text-secondary">
        {money.payDays !== null && t('res.payDaysLine', { d: money.payDays })}
        {money.overdueOne &&
          ' ' +
            t('res.overdueOne', {
              v: moneyWhole(money.overdue),
              who: money.overdueOne.client ?? '—',
              date: format(parseISO(money.overdueOne.sent), 'd MMMM', { locale: dateLocale }),
            })}
        {money.overdueCount > 1 && ' ' + t('res.overdueMany', { n: money.overdueCount, v: moneyWhole(money.overdue) })}
      </p>

      {perHour && (
        <>
          <Divider />
          <Cap>{t('res.perHourTitle')}</Cap>
          <div className="grid grid-cols-3 gap-2">
            <Tile label={t('res.revenue')} value={moneyWhole(perHour.revenue)} hint={t('res.fromHour')} />
            <Tile label={t('res.costHour')} value={moneyWhole(perHour.cost)} hint={t('res.costHourHint')} />
            <Tile
              label={t('res.profitHour')}
              value={moneyWhole(perHour.profit)}
              hint={t('res.profitHourHint')}
              tone={perHour.profit >= 0 ? 'ok' : 'bad'}
            />
          </div>
        </>
      )}

      {projects.count > 0 && (
        <>
          <Divider />
          <Cap>{t('res.projectsYearTitle', { year })}</Cap>
          <p className="text-[12.5px] leading-snug text-text-secondary">
            <b className="font-semibold text-text">
              {tp('res.projectsCount', projects.count).replace('{n}', String(projects.count))}
            </b>{' '}
            {t('res.withHours')}
            {statusParts.length > 0 && ` · ${statusParts.join(' · ')}`}
          </p>
          {[
            projects.best && { p: projects.best, kind: 'best' as const },
            projects.worst && { p: projects.worst, kind: 'worst' as const },
          ]
            .filter((x): x is NonNullable<typeof x> => !!x)
            .map(({ p, kind }) => (
              <div key={kind} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* plakietka tą samą grubością co nazwa — spokojnie, nie krzyczy */}
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-px text-[11px] font-medium',
                      kind === 'best' ? 'bg-success-soft text-success' : 'bg-error-soft text-error',
                    )}
                  >
                    {t(kind === 'best' ? 'res.bestProject' : 'res.worstProject')}
                  </span>
                  <span className="truncate text-[13.5px] font-medium">{p.name}</span>
                </span>
                <span
                  className={cn(
                    'tabular-nums text-[13px] font-bold whitespace-nowrap',
                    p.result >= 0 ? 'text-success' : 'text-error',
                  )}
                >
                  {p.result >= 0 ? '+' : '−'}
                  {moneyWhole(Math.abs(p.result))}
                </span>
                <span className="col-span-2 truncate text-[11.5px] text-text-secondary/80">
                  {[hours(p.hours), t('res.marginShort', { m: p.margin === null ? '—' : `${Math.round(p.margin * 100)}%` }), p.client]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
        </>
      )}
    </>
  );
}

function Divider() {
  return <div className="h-px bg-line" />;
}

function Cap({ children }: { children: string }) {
  return <p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">{children}</p>;
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg px-3 py-2.5">
      <div className="text-[11.5px] text-text-secondary">{label}</div>
      <div
        className={cn(
          'tabular-nums mt-0.5 truncate text-[15.5px] font-bold',
          tone === 'ok' && 'text-success',
          tone === 'bad' && 'text-error',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-text-secondary/80">{hint}</div>
    </div>
  );
}
