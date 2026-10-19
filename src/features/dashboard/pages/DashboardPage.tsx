import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  House,
  Clock,
  Receipt,
  Banknote,
  ClockAlert,
  ChevronRight,
  FileWarning,
  Repeat,
  ReceiptText,
  Scale,
} from 'lucide-react';
import { differenceInCalendarDays, format, getISODay, getISOWeek, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { hours, moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useI18n } from '@/lib/i18n/context';
import { HoursFormSheet } from '@/features/timesheet/components/HoursFormSheet';
import { useLastOwnEntry } from '@/features/timesheet/hooks';
import { ChecklistSection } from '@/features/checklist/components/ChecklistSection';
import { WavyDivider } from '@/components/ui/WavyDivider';
import { useAllInvoices } from '@/features/finance/hooks';
import { CountUp } from '../components/CountUp';
import { ABSENCE_TYPE_TONES } from '@/features/absences/types';
import type { AbsenceType } from '@/types/database';
import {
  useDashboardKpi,
  usePayslipReminder,
  usePendingApprovals,
  useThisWeek,
  useToday,
} from '../hooks';

/** Pierwsza litera wielka — nazwy miesięcy/dni z date-fns bywają małą literą. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DashboardPage() {
  const kpi = useDashboardKpi();
  const today = useToday();
  const navigate = useNavigate();
  const { user, can } = useSession();
  const { t, tp, dateLocale } = useI18n();
  const seesAll = can('hours_view_all');
  const canManagePayslips = user?.role === 'admin' || can('payslips_manage');
  const thisWeek = useThisWeek(true);
  const pending = usePendingApprovals();
  const payslipReminder = usePayslipReminder(canManagePayslips);
  const [hoursFormOpen, setHoursFormOpen] = useState(false);
  // „Jak wczoraj": formularz wypełniony ostatnim własnym wpisem (zapis dopiero po „Zapisz")
  const [repeatMode, setRepeatMode] = useState(false);
  // Faktury po terminie (tylko finance_view — hook sam się wyłącza bez flagi)
  const invoices = useAllInvoices();
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const overdue = (invoices.data ?? [])
    .filter((i) => !i.paid_at && i.due_at && i.due_at < todayIso)
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!));
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.amount), 0);
  const lastEntry = useLastOwnEntry(user?.id, todayIso, !seesAll);
  const last = lastEntry.data ?? null;
  // „wczoraj" / „w piątek" (do 6 dni wstecz) / „ostatnio"
  const repeatWhen = (() => {
    if (!last) return '';
    const days = differenceInCalendarDays(new Date(), parseISO(last.date));
    if (days === 1) return t('dash.whenYesterday');
    if (days <= 6) return t('dash.whenDays').split('|')[getISODay(parseISO(last.date)) - 1] ?? '';
    return t('dash.whenLast');
  })();
  const oldestDays = overdue[0]
    ? differenceInCalendarDays(new Date(), parseISO(overdue[0].due_at!))
    : 0;

  const now = new Date();
  const todayLabel = format(now, 'EEEE d/MM', { locale: dateLocale });
  const weekNo = getISOWeek(now);

  const tiles = [
    ...(can('projects_view')
      ? [
          {
            label: t('dash.activeProjects'),
            value: kpi.data ? <CountUp value={kpi.data.activeProjects} format={String} /> : '—',
            icon: House,
            demo: false,
            onClick: () => navigate('/projekty'),
          },
        ]
      : []),
    {
      label: t('dash.hoursMonth'),
      value: kpi.data ? <CountUp value={kpi.data.hoursThisMonth} format={hours} /> : '—',
      icon: Clock,
      demo: false,
      onClick: () => navigate('/godziny'),
    },
    // finance_view: zysk miesiąca (jak w Finansach) + „czeka na wpłatę";
    // pozostali z flagą kosztów — paragony jak dotąd
    ...(can('finance_view')
      ? [
          // Number.isFinite — stary cache (persist) może nie mieć tych pól
          {
            label: t('dash.profitMonth'),
            value: Number.isFinite(kpi.data?.monthProfit) ? (
              <CountUp
                value={kpi.data!.monthProfit!}
                format={(n) => `${n > 0 ? '+' : ''}${moneyWhole(n)}`}
              />
            ) : (
              '—'
            ),
            valueClass: Number.isFinite(kpi.data?.monthProfit)
              ? kpi.data!.monthProfit! >= 0
                ? 'text-success'
                : 'text-accent'
              : undefined,
            icon: Scale,
            demo: false,
            onClick: () => navigate('/finanse'),
          },
          {
            label: t('dash.awaiting'),
            value: Number.isFinite(kpi.data?.awaitingTotal) ? (
              <CountUp value={kpi.data!.awaitingTotal!} format={moneyWhole} />
            ) : (
              '—'
            ),
            icon: Banknote,
            demo: false,
            onClick: () => navigate('/finanse'),
          },
        ]
      : can('expenses_add') || can('expenses_view_all')
        ? [
            {
              label: t('dash.expensesMonth'),
              value: kpi.data ? (
                <CountUp value={kpi.data.expensesThisMonth} format={moneyWhole} />
              ) : (
                '—'
              ),
              icon: Receipt,
              demo: false,
              onClick: () => navigate('/finanse'),
            },
          ]
        : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3" aria-label={t('dash.indicators')}>
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            interactive
            className="relative min-h-[92px] overflow-hidden p-4"
            onClick={tile.onClick}
          >
            <tile.icon
              aria-hidden
              className="pointer-events-none absolute -right-3 top-1/2 size-24 -translate-y-1/2 text-accent/10"
              strokeWidth={1.5}
            />
            <div className="relative flex flex-col gap-1">
              <span
                className={cn(
                  'tabular-nums text-2xl font-semibold leading-tight',
                  'valueClass' in tile ? tile.valueClass : undefined,
                )}
              >
                {tile.value}
              </span>
              <span className="text-xs text-text-secondary">{tile.label}</span>
            </div>
            {tile.demo && <Badge className="absolute right-2 top-2">{t('dash.soon')}</Badge>}
          </Card>
        ))}
      </section>

      {/* Pracownik: skrót do własnych specyfikacji */}
      {!canManagePayslips && (
        <Card
          interactive
          className="flex items-center gap-3 p-4"
          onClick={() => navigate('/wyplaty')}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <ReceiptText className="size-6 text-accent" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('dash.payslipsTitle')}</p>
            <p className="text-xs text-text-secondary">{t('dash.payslipsSub')}</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-text-secondary" />
        </Card>
      )}

      {/* Manager wypłat: przypomnienie od 20. dnia, gdy brakuje specyfikacji */}
      {payslipReminder.data?.show && (
        <Card
          interactive
          className="flex items-center gap-3 border-l-4 border-accent p-4"
          onClick={() => navigate('/wyplaty')}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <ReceiptText className="size-6 text-accent" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {/* Number.isFinite — stary cache (persist) może nie mieć daysLeft */}
              {!Number.isFinite(payslipReminder.data.daysLeft)
                ? t('dash.payslipReminderTitle')
                : payslipReminder.data.daysLeft > 0
                  ? t('dash.payslipDue', {
                      n: payslipReminder.data.daysLeft,
                      days: tp('dash.dayWord', payslipReminder.data.daysLeft),
                    })
                  : payslipReminder.data.daysLeft === 0
                    ? t('dash.payslipToday')
                    : t('dash.payslipOverdue')}
            </p>
            <p className="text-xs text-text-secondary">
              {t('dash.payslipReminderSub', {
                month: cap(payslipReminder.data.monthLabel),
                n: payslipReminder.data.missing,
                worker: tp('dash.worker', payslipReminder.data.missing),
              })}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-text-secondary" />
        </Card>
      )}

      {can('finance_view') && overdue.length > 0 && (
        <Card
          interactive
          className="flex items-center gap-3 border-l-4 border-error p-4"
          onClick={() => navigate('/finanse')}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-error-soft">
            <FileWarning className="size-6 text-error" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {tp('dash.overdueTitle', overdue.length).replace('{n}', String(overdue.length))}
            </p>
            <p className="tabular-nums truncate text-xs text-text-secondary">
              {overdue.length === 1
                ? t('dash.overdueOne', {
                    amount: moneyWhole(overdueTotal),
                    project: overdue[0]!.project?.name ?? '—',
                    n: oldestDays,
                    d: tp('ts.day', oldestDays),
                  })
                : t('dash.overdueMany', {
                    amount: moneyWhole(overdueTotal),
                    n: oldestDays,
                    d: tp('ts.day', oldestDays),
                  })}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-text-secondary" />
        </Card>
      )}

      {can('hours_approve') && (pending.data?.count ?? 0) > 0 && (
        <Card
          interactive
          className="flex items-center gap-3 border-l-4 border-warning p-4"
          onClick={() => navigate('/godziny')}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <ClockAlert className="animate-ring size-6 text-warning" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('dash.pendingTitle')}</p>
            <p className="text-xs text-text-secondary">
              {t('dash.pendingSub', {
                n: pending.data!.count,
                entry: tp('dash.entry', pending.data!.count),
                hours: hours(pending.data!.hours),
              })}
            </p>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold first-letter:capitalize">
          {t('dash.today', { date: todayLabel })}
        </h2>
        {!seesAll &&
        today.data &&
        today.data.entries.length === 0 &&
        today.data.absences.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-(--radius-card) bg-gradient-to-br from-accent to-[#8E0000] p-6 text-center text-white shadow-(--shadow-fab)">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
              <Clock className="size-7" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-base font-semibold">{t('dash.goodMorning')}</p>
              <p className="mt-0.5 text-sm text-white/80">{t('dash.noEntryToday')}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                type="button"
                className="press h-12 w-full rounded-(--radius-input) bg-white text-sm font-semibold text-accent"
                onClick={() => {
                  setRepeatMode(false);
                  setHoursFormOpen(true);
                }}
              >
                {t('dash.addTodayHours')}
              </button>
              {last && (
                <button
                  type="button"
                  className="press flex h-14 w-full items-center gap-2.5 rounded-(--radius-input) bg-white/15 px-3.5 text-left"
                  onClick={() => {
                    setRepeatMode(true);
                    setHoursFormOpen(true);
                  }}
                >
                  <Repeat className="size-5 shrink-0" strokeWidth={2} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold first-letter:uppercase">
                      {t('dash.repeatBtn', { when: repeatWhen })}
                    </span>
                    <span className="tabular-nums block truncate text-xs text-white/80">
                      {last.project?.name ?? '—'} • {num(last.hours)} h
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 opacity-70" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <Card className="flex flex-col gap-2 p-4">
            {seesAll &&
              today.data &&
              today.data.entries.length === 0 &&
              today.data.absences.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="size-5" /> {t('dash.nobodyToday')}
                </p>
              )}
            {today.data?.entries.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm">
                  <span className="font-medium">{seesAll ? e.employeeName : e.projectName}</span>{' '}
                  {seesAll && <span className="text-text-secondary">— {e.projectName}</span>}
                </span>
                <span className="tabular-nums shrink-0 text-sm font-semibold">
                  {num(e.hours)} h
                </span>
              </div>
            ))}
            {today.data?.absences.map((a, i) => (
              <div key={`a${i}`} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{a.employeeName}</span>
                <Badge tone={ABSENCE_TYPE_TONES[a.type as AbsenceType] ?? 'neutral'}>
                  {t(`absence.${a.type}`)}
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      {thisWeek.data && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t('dash.thisWeek')}</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              V{weekNo}
            </span>
          </div>
          <Card className="flex flex-col divide-y divide-line">
            {thisWeek.data.map((day) => {
              const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
              return (
                <div
                  key={day.date}
                  className={cn(
                    'flex items-center gap-3 p-3',
                    day.hours === 0 && 'opacity-45',
                    isToday && 'bg-accent-soft/40',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize">
                      {format(new Date(day.date), 'EEEE, dd.MM', { locale: dateLocale })}
                      {isToday && (
                        <span className="ml-1.5 text-xs font-normal text-accent">
                          {t('dash.todayShort')}
                        </span>
                      )}
                    </p>
                    {day.projects.length > 0 && (
                      <p className="truncate text-xs text-text-secondary">
                        {day.projects.join(' • ')}
                      </p>
                    )}
                  </div>
                  <span className="tabular-nums shrink-0 text-sm font-semibold">
                    {day.hours > 0 ? `${num(day.hours)} h` : '—'}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {thisWeek.data && <WavyDivider />}

      <ChecklistSection />

      <HoursFormSheet
        open={hoursFormOpen}
        onClose={() => setHoursFormOpen(false)}
        entry={null}
        template={repeatMode ? last : null}
        templateWhen={repeatMode ? repeatWhen : undefined}
      />
    </div>
  );
}
