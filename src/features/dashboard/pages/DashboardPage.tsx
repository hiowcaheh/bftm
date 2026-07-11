import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  House,
  Clock,
  Receipt,
  Banknote,
  ClockAlert,
  ChevronRight,
  Plus,
  ReceiptText,
  Sunrise,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FAB } from '@/components/ui/FAB';
import { cn } from '@/lib/cn';
import { hours, moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { HoursFormSheet } from '@/features/timesheet/components/HoursFormSheet';
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_TONES } from '@/features/absences/types';
import type { AbsenceType } from '@/types/database';
import {
  useDashboardKpi,
  usePayslipReminder,
  usePendingApprovals,
  useThisWeek,
  useToday,
} from '../hooks';

export default function DashboardPage() {
  const kpi = useDashboardKpi();
  const today = useToday();
  const navigate = useNavigate();
  const { user, can } = useSession();
  const seesAll = can('hours_view_all');
  const canManagePayslips = user?.role === 'admin' || can('payslips_manage');
  const thisWeek = useThisWeek(true);
  const pending = usePendingApprovals();
  const payslipReminder = usePayslipReminder(canManagePayslips);
  const [hoursFormOpen, setHoursFormOpen] = useState(false);

  const tiles = [
    ...(can('projects_view')
      ? [
          {
            label: 'Aktywne projekty',
            value: kpi.data ? String(kpi.data.activeProjects) : '—',
            icon: House,
            demo: false,
            onClick: () => navigate('/projekty'),
          },
        ]
      : []),
    {
      label: 'Godziny w tym miesiącu',
      value: kpi.data ? hours(kpi.data.hoursThisMonth) : '—',
      icon: Clock,
      demo: false,
      onClick: () => navigate('/godziny'),
    },
    ...(can('expenses_add') || can('expenses_view_all') || can('finance_view')
      ? [
          {
            label: 'Koszty w tym miesiącu',
            value: kpi.data ? moneyWhole(kpi.data.expensesThisMonth) : '—',
            icon: Receipt,
            demo: false,
            onClick: () => navigate('/finanse'),
          },
        ]
      : []),
    ...(can('finance_view')
      ? [
          {
            label: 'Nieopłacone faktury',
            value: kpi.data ? moneyWhole(kpi.data.unpaidInvoices ?? 0) : '—',
            icon: Banknote,
            demo: false,
            onClick: () => navigate('/finanse'),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3" aria-label="Wskaźniki">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            interactive
            className="flex flex-col gap-2 p-4"
            onClick={tile.onClick}
          >
            <div className="flex items-center justify-between">
              <tile.icon className="size-5 text-accent" strokeWidth={1.8} />
              {tile.demo && <Badge>wkrótce</Badge>}
            </div>
            <span className="tabular-nums text-lg font-semibold">{tile.value}</span>
            <span className="text-xs text-text-secondary">{tile.label}</span>
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
            <p className="text-sm font-semibold">Specyfikacje wypłaty</p>
            <p className="text-xs text-text-secondary">
              Twoje specyfikacje wypłaty i historia
            </p>
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
            <p className="text-sm font-semibold">Zostało 5 dni do wypłat</p>
            <p className="text-xs text-text-secondary">
              Uzupełnij specyfikacje za <span className="capitalize">{payslipReminder.data.monthLabel}</span> —
              brakuje {payslipReminder.data.missing}{' '}
              {payslipReminder.data.missing === 1 ? 'pracownika' : 'pracowników'}
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
            <p className="text-sm font-semibold">Czekają na zatwierdzenie</p>
            <p className="text-xs text-text-secondary">
              {pending.data!.count}{' '}
              {pending.data!.count === 1 ? 'wpis' : pending.data!.count < 5 ? 'wpisy' : 'wpisów'} •{' '}
              {hours(pending.data!.hours)} — tapnij, aby przejść do dziennika
            </p>
          </div>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{seesAll ? 'Dziś w pracy' : 'Twój dzień'}</h2>
        {!seesAll &&
        today.data &&
        today.data.entries.length === 0 &&
        today.data.absences.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-(--radius-card) bg-gradient-to-br from-accent to-[#8E0000] p-6 text-center text-white shadow-(--shadow-fab)">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/15">
              <Sunrise className="size-7" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-base font-semibold">Dzień dobry! 👋</p>
              <p className="mt-0.5 text-sm text-white/80">
                Nie masz jeszcze wpisu na dziś — dodaj godziny jednym tapnięciem.
              </p>
            </div>
            <button
              type="button"
              className="press h-12 w-full rounded-(--radius-input) bg-white text-sm font-semibold text-accent"
              onClick={() => setHoursFormOpen(true)}
            >
              Dodaj dzisiejsze godziny
            </button>
          </div>
        ) : (
          <Card className="flex flex-col gap-2 p-4">
            {seesAll &&
              today.data &&
              today.data.entries.length === 0 &&
              today.data.absences.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-text-secondary">
                  <Sunrise className="size-5" /> Nikt jeszcze nie wpisał dziś godzin.
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
                  {ABSENCE_TYPE_LABELS[a.type as AbsenceType] ?? a.type}
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      {thisWeek.data && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Ten tydzień</h2>
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
                      {format(new Date(day.date), 'EEEE, dd.MM', { locale: pl })}
                      {isToday && (
                        <span className="ml-1.5 text-xs font-normal text-accent">dziś</span>
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

      <FAB
        label="Dodaj godziny"
        onClick={() => setHoursFormOpen(true)}
        icon={<Plus className="size-7" />}
      />
      <HoursFormSheet
        open={hoursFormOpen}
        onClose={() => setHoursFormOpen(false)}
        entry={null}
      />
    </div>
  );
}
