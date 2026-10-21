import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { moneyWhole, num } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import type { Lang } from '@/lib/i18n/types';
import { useSession } from '@/features/auth/SessionProvider';
import { buildYear, type MonthStat } from '../analysis';
import { monthStory, yearStory, type StoryFmt } from '../story';
import { useResultsYear } from '../hooks';
import { YearChart, type Metric } from '../components/YearChart';
import { MonthCard } from '../components/MonthCard';

const LOCALES: Record<Lang, string> = { pl: 'pl-PL', sv: 'sv-SE', en: 'en-GB', uk: 'uk-UA' };

/** Zakładka Rezultat: rok w liczbach, wykres sty–gru i analiza miesięcy. */
export default function ResultsPage() {
  const { can } = useSession();
  // flaga tylko dla adminów (results_view) — zmiana działa od razu (realtime profilu)
  if (!can('results_view')) return <Navigate to="/" replace />;
  return <Results />;
}

function Results() {
  const { t, tp, lang, dateLocale } = useI18n();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [metric, setMetric] = useState<Metric>('money');
  const [picked, setPicked] = useState<{ year: number; m: number } | null>(null);
  const [flash, setFlash] = useState(0);

  const query = useResultsYear(year);
  const stat = useMemo(() => (query.data ? buildYear(query.data, today) : null), [query.data, today]);

  const firstYear = stat?.firstDay ? Number(stat.firstDay.slice(0, 4)) : today.getFullYear();
  const minYear = Math.min(firstYear, today.getFullYear()) - 1;
  const maxYear = today.getFullYear() + 1;

  // domyślnie ostatni miesiąc z danymi
  const lastWithData = stat ? [...stat.months].reverse().find((x) => !!x)?.m ?? null : null;
  const selected = picked?.year === year ? picked.m : lastWithData;
  const x = selected && stat ? (stat.months[selected - 1] ?? null) : null;
  const prev = selected && stat ? findPrev(stat.months, selected) : null;

  const compact = useMemo(
    () => new Intl.NumberFormat(LOCALES[lang], { notation: 'compact', maximumSignificantDigits: 3 }),
    [lang],
  );
  const fmt: StoryFmt = {
    money: moneyWhole,
    hours: (h) => `${num(Math.round(h * 10) / 10)} h`,
    num,
    day: (iso) => format(parseISO(iso), 'd MMM', { locale: dateLocale }).replace('.', ''),
    month: (m) => format(new Date(year, m - 1, 1), 'LLLL', { locale: dateLocale }),
    monthShort: (m) => format(new Date(year, m - 1, 1), 'LLL', { locale: dateLocale }).replace('.', ''),
  };

  const months = stat?.months.filter((m): m is MonthStat => !!m) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* wybór roku jak wybór okresu w Finansach: przyciski po bokach, rok na środku */}
      <div className="flex items-center justify-between gap-2">
        <YearBtn label={t('res.prevYear')} disabled={year <= minYear} onClick={() => setYear(year - 1)}>
          <ChevronLeft className="size-5" />
        </YearBtn>
        <div className="min-w-0 text-center">
          <p className="tabular-nums text-[17px] leading-tight font-bold">{year}</p>
          <p className="truncate text-xs text-text-secondary">
            {!stat
              ? '\u00a0'
              : months.length === 0
                ? t('res.noDataShort')
                : months.length === 1
                  ? fmt.month(months[0]!.m)
                  : `${fmt.month(months[0]!.m)} – ${fmt.month(months[months.length - 1]!.m)}`}
          </p>
        </div>
        <YearBtn label={t('res.nextYear')} disabled={year >= maxYear} onClick={() => setYear(year + 1)}>
          <ChevronRight className="size-5" />
        </YearBtn>
      </div>

      {query.isLoading && <SkeletonList rows={4} />}
      {query.isError && <EmptyState icon={TrendingUp} message={t('res.loadError')} />}

      {stat && months.length === 0 && (
        <Card className="p-2">
          <EmptyState
            icon={TrendingUp}
            message={
              year > today.getFullYear()
                ? t('res.emptyFuture', { year })
                : year < firstYear
                  ? t('res.emptyPast', { year, date: stat.firstDay ? fmt.day(stat.firstDay) + ` ${firstYear}` : '' })
                  : t('res.emptyYear', { year })
            }
          />
        </Card>
      )}

      {stat && months.length > 0 && (
        <>
          <Card className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
                {t('res.yearResult', { year })}
              </p>
              <p
                className={cn(
                  'tabular-nums mt-1.5 text-[34px] leading-none font-extrabold tracking-tight',
                  stat.totals.result >= 0 ? 'text-success' : 'text-error',
                )}
              >
                {stat.totals.result >= 0 ? '+' : ''}
                {moneyWhole(stat.totals.result)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Tile label={t('res.revenue')} value={compact.format(stat.totals.revenue)} hint={t('res.krRevenue')} />
              <Tile label={t('res.costs')} value={compact.format(stat.totals.cost)} hint={t('res.krCosts')} />
              <Tile
                label={t('res.margin')}
                value={stat.totals.margin === null ? '—' : `${Math.round(stat.totals.margin * 100)}%`}
                hint={t('res.hoursWork', { h: fmt.hours(stat.totals.hours) })}
              />
            </div>
            <p className="text-sm leading-relaxed">{yearStory(stat, t, fmt)}</p>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <Chips
              options={[
                { value: 'money', label: t('res.metricMoney') },
                { value: 'result', label: t('res.metricResult') },
                { value: 'hours', label: t('res.metricHours') },
              ]}
              value={metric}
              onChange={(v) => v && setMetric(v)}
            />
            <p className="-mb-1 text-xs text-text-secondary/80">{t('res.chartHint')}</p>
            <YearChart
              stat={stat}
              metric={metric}
              selected={selected}
              onSelect={(m) => {
                setPicked({ year, m });
                setFlash((f) => f + 1);
              }}
              monthLabel={fmt.monthShort}
            />
          </Card>

          {x && (
            <MonthCard
              key={`${year}-${x.m}-${flash}`}
              x={x}
              prev={prev}
              title={`${fmt.month(x.m)} ${year}`}
              sub={monthSub(x, t, tp, fmt)}
              badge={x.live ? 'live' : stat.bestM === x.m ? 'best' : stat.worstM === x.m ? 'worst' : x.first ? 'first' : null}
              story={monthStory(x, prev, stat, t, tp, fmt)}
              money={moneyWhole}
              hours={fmt.hours}
              flash={flash > 0}
            />
          )}

          <ClientsCard stat={stat} t={t} fmt={fmt} compact={compact} year={year} />
        </>
      )}
    </div>
  );
}

function findPrev(months: Array<MonthStat | null>, m: number): MonthStat | null {
  // poprzedni miesiąc z danymi tylko gdy to bezpośrednio poprzedni (bez dziur)
  return m >= 2 ? (months[m - 2] ?? null) : null;
}

function monthSub(
  x: MonthStat,
  t: (k: string, v?: Record<string, string | number>) => string,
  tp: (k: string, n: number) => string,
  fmt: StoryFmt,
) {
  const parts = [
    fmt.hours(x.hours),
    tp('res.projectsCount', x.projectCount).replace('{n}', String(x.projectCount)),
    tp('res.peopleCount', x.people).replace('{n}', String(x.people)),
  ];
  if (x.live) parts.unshift(t('res.untilToday'));
  else if (x.first && x.firstDay) parts.unshift(t('res.fromDay', { date: fmt.day(x.firstDay) }));
  return parts.join(' · ');
}

function YearBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card) disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg px-3 py-2.5">
      <div className="text-[11.5px] text-text-secondary">{label}</div>
      <div className="tabular-nums mt-0.5 truncate text-[15.5px] font-bold">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-text-secondary/80">{hint}</div>
    </div>
  );
}

function ClientsCard({
  stat,
  t,
  fmt,
  compact,
  year,
}: {
  stat: NonNullable<ReturnType<typeof buildYear>>;
  t: (k: string, v?: Record<string, string | number>) => string;
  fmt: StoryFmt;
  compact: Intl.NumberFormat;
  year: number;
}) {
  const clients = stat.clients.filter((c) => c.revenue > 0 || c.hours >= 8);
  if (!clients.length) return null;
  const max = Math.max(1, ...clients.map((c) => c.revenue));
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
        {t('res.clientsTitle', { year })}
      </p>
      <div className="flex flex-col gap-2.5">
        {clients.map((c) => {
          const m = c.margin === null ? null : Math.round(c.margin * 100);
          const color =
            m === null ? 'var(--color-text-secondary)' : m >= 30 ? 'var(--color-success)' : m >= 15 ? 'var(--color-text)' : 'var(--color-warning)';
          return (
            <div key={c.id ?? 'none'} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1">
              <span className="truncate text-[13.5px] font-medium">{c.name ?? t('res.noClient')}</span>
              <span className="tabular-nums text-[13px] font-bold whitespace-nowrap">
                {compact.format(c.revenue)} kr
              </span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(3, (c.revenue / max) * 100)}%`, background: color }}
                />
              </span>
              <span className="tabular-nums col-span-2 text-[11.5px] text-text-secondary/80">
                {t('res.clientLine', {
                  h: fmt.hours(c.hours),
                  res: `${c.result >= 0 ? '+' : ''}${moneyWhole(c.result)}`,
                  m: m === null ? '—' : `${m}%`,
                })}
                {c.payDays !== null && t('res.clientPays', { d: c.payDays })}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11.5px] leading-snug text-text-secondary/80">{t('res.clientsNote')}</p>
    </Card>
  );
}
