import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfISOWeek,
  endOfMonth,
  format,
  getISODay,
  getISOWeek,
  isSameISOWeek,
  isSameMonth,
  min as minDate,
  startOfISOWeek,
  startOfMonth,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { moneyWhole, monthYear } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import ExpensesPage from '@/features/expenses/pages/ExpensesPage';
import { FEATURES } from '@/lib/featureFlags';
import { projectCost, projectValue } from '../api';
import { useFinanceDaily, useFinanceSummary } from '../hooks';
import { CostBreakdown } from '../components/CostBreakdown';
import { DeltaLine, delta } from '../components/DeltaLine';
import { FinanceBars, type BarGroup } from '../components/FinanceBars';
import { InvoicesSection } from '../components/InvoicesSection';

type Mode = 'week' | 'month';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Zakładka Finanse: live sytuacja okresu, wykresy, rentowność projektów. */
export default function FinancePage() {
  const { can } = useSession();
  // Bez finance_view zakładka pokazuje wyłącznie paragony (gdy nie są ukryte)
  if (!can('finance_view')) {
    return FEATURES.receipts ? <ExpensesPage /> : <Navigate to="/" replace />;
  }
  return <FinanceReport />;
}

function FinanceReport() {
  const navigate = useNavigate();
  const { t, dateLocale } = useI18n();
  const [mode, setMode] = useState<Mode>('month');
  const [anchor, setAnchor] = useState(new Date());

  const from =
    mode === 'week' ? iso(startOfISOWeek(anchor)) : iso(startOfMonth(anchor));
  const to = mode === 'week' ? iso(endOfISOWeek(anchor)) : iso(endOfMonth(anchor));
  const label =
    mode === 'week'
      ? `${t('ts.weekLabel', { n: getISOWeek(anchor) })} • ${format(startOfISOWeek(anchor), 'dd.MM')}–${format(endOfISOWeek(anchor), 'dd.MM')}`
      : monthYear(anchor);

  const summary = useFinanceSummary(from, to);
  const daily = useFinanceDaily(from, to);

  // Porównanie z poprzednim okresem: bieżący miesiąc/tydzień → ten sam kawałek
  // poprzedniego (1–21 paź vs 1–21 wrz), zamknięty → cały poprzedni.
  const now = new Date();
  const prev = (() => {
    if (mode === 'week') {
      const pw = subWeeks(anchor, 1);
      const pf = startOfISOWeek(pw);
      const current = isSameISOWeek(anchor, now);
      return {
        from: iso(pf),
        to: iso(current ? addDays(pf, getISODay(now) - 1) : endOfISOWeek(pw)),
        label: t('fin.vsWeek', { n: getISOWeek(pw) }),
      };
    }
    const pm = subMonths(anchor, 1);
    const pf = startOfMonth(pm);
    if (isSameMonth(anchor, now)) {
      const pt = minDate([addDays(pf, now.getDate() - 1), endOfMonth(pm)]);
      return {
        from: iso(pf),
        to: iso(pt),
        label: `${format(pf, 'd')}–${format(pt, 'd MMM', { locale: dateLocale }).replace('.', '')}`,
      };
    }
    return { from: iso(pf), to: iso(endOfMonth(pm)), label: format(pm, 'LLLL', { locale: dateLocale }) };
  })();
  const prevSummary = useFinanceSummary(prev.from, prev.to);
  const prevDaily = useFinanceDaily(prev.from, prev.to);

  const totals = useMemo(() => {
    const days = daily.data ?? [];
    const revenue = days.reduce((s, d) => s + d.revenue, 0);
    const labor = days.reduce((s, d) => s + d.labor_cost, 0);
    const expenses = days.reduce((s, d) => s + d.expenses, 0);
    const projects = summary.data ?? [];
    const awaiting = projects.reduce((s, p) => s + p.awaiting_total, 0);
    const paidInRange = projects.reduce((s, p) => s + p.paid_range_total, 0);
    return {
      revenue,
      labor,
      expenses,
      costs: labor + expenses,
      profit: revenue - labor - expenses,
      awaiting,
      paidInRange,
    };
  }, [daily.data, summary.data]);

  const prevTotals = useMemo(() => {
    if (!prevDaily.data || !prevSummary.data) return null;
    const revenue = prevDaily.data.reduce((s, d) => s + d.revenue, 0);
    const costs = prevDaily.data.reduce((s, d) => s + d.labor_cost + d.expenses, 0);
    const paidInRange = prevSummary.data.reduce((s, p) => s + p.paid_range_total, 0);
    return { revenue, costs, profit: revenue - costs, paidInRange };
  }, [prevDaily.data, prevSummary.data]);
  const vs = t('fin.vs', { p: prev.label });

  const barGroups = useMemo<BarGroup[]>(() => {
    const days = daily.data ?? [];
    if (mode === 'week') {
      return days.map((d) => ({
        key: d.day,
        label: format(new Date(d.day), 'EEEEEE', { locale: dateLocale }),
        revenue: d.revenue,
        cost: d.labor_cost + d.expenses,
      }));
    }
    // miesiąc → grupowanie po tygodniach ISO
    const byWeek = new Map<number, BarGroup>();
    for (const d of days) {
      const week = getISOWeek(new Date(d.day));
      const g = byWeek.get(week) ?? {
        key: `w${week}`,
        label: `T${week}`,
        revenue: 0,
        cost: 0,
      };
      g.revenue += d.revenue;
      g.cost += d.labor_cost + d.expenses;
      byWeek.set(week, g);
    }
    return [...byWeek.values()];
  }, [daily.data, mode]);

  // koszty bez projektu (paragony ogólne) — osobna pozycja w strukturze kosztów
  const generalCosts =
    totals.expenses - (summary.data ?? []).reduce((s, p) => s + p.expenses_range, 0);

  const projectRows = useMemo(() => {
    return (summary.data ?? [])
      .map((p) => ({ p, value: projectValue(p), cost: projectCost(p) }))
      .filter(
        ({ p, value, cost }) =>
          value > 0 || cost > 0 || p.status === 'active' || p.invoice_count > 0,
      )
      .sort((a, b) => b.value - b.cost - (a.value - a.cost));
  }, [summary.data]);

  const loading = summary.isLoading || daily.isLoading;
  const shift = (dir: 1 | -1) =>
    setAnchor((a) =>
      mode === 'week'
        ? dir === 1
          ? addWeeks(a, 1)
          : subWeeks(a, 1)
        : dir === 1
          ? addMonths(a, 1)
          : subMonths(a, 1),
    );

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        options={[
          { value: 'week', label: t('ts.week') },
          { value: 'month', label: t('ts.month') },
        ]}
        value={mode}
        onChange={setMode}
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t('ts.prevPeriod')}
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="tabular-nums text-sm font-semibold capitalize">{label}</p>
        <button
          type="button"
          aria-label={t('ts.nextPeriod')}
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => shift(1)}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {loading && <SkeletonList rows={5} />}

      {!loading && (
        <>
          <Card className="flex items-center gap-4 p-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-full',
                totals.profit >= 0 ? 'bg-success-soft' : 'bg-error-soft',
              )}
            >
              {totals.profit >= 0 ? (
                <TrendingUp className="size-6 text-success" strokeWidth={1.8} />
              ) : (
                <TrendingDown className="size-6 text-error" strokeWidth={1.8} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">{t('fin.profitPeriod')}</p>
              <p
                className={cn(
                  'text-2xl font-semibold',
                  totals.profit >= 0 ? 'text-success' : 'text-error',
                )}
              >
                {moneyWhole(totals.profit)}
              </p>
              <DeltaLine delta={delta(totals.profit, prevTotals?.profit)} label={vs} />
            </div>
          </Card>

          <section className="grid grid-cols-2 gap-3" aria-label={t('fin.finSummary')}>
            <Card className="flex flex-col gap-1 p-4">
              <span className="text-xs text-text-secondary">{t('fin.earned')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {moneyWhole(totals.revenue)}
              </span>
              <DeltaLine delta={delta(totals.revenue, prevTotals?.revenue)} label={vs} />
            </Card>
            <Card className="flex flex-col gap-1 p-4">
              <span className="text-xs text-text-secondary">{t('fin.costs')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {moneyWhole(totals.costs)}
              </span>
              {/* koszty w górę = gorzej (czerwone) */}
              <DeltaLine delta={delta(totals.costs, prevTotals?.costs, false)} label={vs} />
            </Card>
            <Card className="flex flex-col gap-1 p-4">
              <span className="text-xs text-text-secondary">{t('fin.awaiting')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {moneyWhole(totals.awaiting)}
              </span>
              <span className="text-[11px] text-text-secondary">{t('fin.stateToday')}</span>
            </Card>
            <Card className="flex flex-col gap-1 p-4">
              <span className="text-xs text-text-secondary">{t('fin.paidPeriod')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {moneyWhole(totals.paidInRange)}
              </span>
              <DeltaLine delta={delta(totals.paidInRange, prevTotals?.paidInRange)} label={vs} />
            </Card>
          </section>

          {barGroups.some((g) => g.revenue > 0 || g.cost > 0) && (
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-semibold">{t('fin.periodChart')}</h2>
              <FinanceBars groups={barGroups} />
            </Card>
          )}

          {totals.costs > 0.5 && (
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-semibold">{t('fin.costStructure')}</h2>
              <CostBreakdown
                projects={summary.data ?? []}
                generalCosts={generalCosts}
                from={from}
                to={to}
                periodLabel={label}
              />
            </Card>
          )}

          {/* Faktury nad rentownością — najczęściej używane, bez długiego przewijania */}
          <InvoicesSection />

          {projectRows.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">{t('fin.profitability')}</h2>
              <Card className="flex flex-col divide-y divide-line">
                {projectRows.map(({ p, value, cost }) => {
                  const profit = value - cost;
                  return (
                    <button
                      key={p.project_id}
                      type="button"
                      className="press flex items-center gap-3 p-3 text-left"
                      onClick={() => navigate(`/projekty/${p.project_id}`)}
                    >
                      <div
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color ?? '#CC0000' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="tabular-nums mt-0.5 text-xs text-text-secondary">
                          {t('fin.valueCosts', { value: moneyWhole(value), cost: moneyWhole(cost) })}
                        </p>
                        {p.invoice_count > 0 && (
                          <div className="mt-1">
                            {p.awaiting_total > 0 ? (
                              <Badge tone="warning">
                                {t('fin.awaitingAmount', { amount: moneyWhole(p.awaiting_total) })}
                              </Badge>
                            ) : (
                              <Badge tone="success">
                                {p.invoice_count === 1
                                  ? t('fin.invoicePaidOne')
                                  : t('fin.invoicePaidMany')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'tabular-nums shrink-0 text-sm font-semibold',
                          profit >= 0 ? 'text-success' : 'text-error',
                        )}
                      >
                        {profit >= 0 ? '+' : ''}
                        {moneyWhole(profit)}
                      </span>
                    </button>
                  );
                })}
              </Card>
            </section>
          )}

          {FEATURES.receipts && (
            <ListGroup>
              <ListRow
                leading={
                  <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
                    <Receipt className="size-5 text-text-secondary" strokeWidth={1.8} />
                  </div>
                }
                title={t('fin.receiptsRow')}
                subtitle={t('fin.receiptsRowSub')}
                chevron
                onClick={() => navigate('/finanse/paragony')}
              />
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
