import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Share2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { Copy, Link2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { hours as fmtHours, moneyWhole, monthYear, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_TONES } from '@/features/absences/types';
import { reportShareUrl } from '../api';
import {
  useAbsencesReport,
  useCreateReportShare,
  useHoursReport,
  useHoursTotal,
} from '../hooks';
import type { ReportAbsence, ReportEmployee, ReportProject } from '../api';

type Tab = 'employees' | 'projects';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function ReportsPage() {
  const { can } = useSession();
  const [anchor, setAnchor] = useState(new Date());
  const [tab, setTab] = useState<Tab>('employees');
  const [expanded, setExpanded] = useState<string | null>(null);

  const from = iso(startOfMonth(anchor));
  const to = iso(endOfMonth(anchor));
  const prevFrom = iso(startOfMonth(subMonths(anchor, 1)));
  const prevTo = iso(endOfMonth(subMonths(anchor, 1)));
  const report = useHoursReport(from, to);
  const prevTotal = useHoursTotal(prevFrom, prevTo);
  const absences = useAbsencesReport(from, to);
  const data = report.data;
  const finance = data?.finance ?? false;

  const absByEmployee = useMemo(() => {
    const map: Record<string, ReportAbsence[]> = {};
    for (const a of absences.data ?? []) {
      (map[a.employeeId] ??= []).push(a);
    }
    return map;
  }, [absences.data]);

  // Lista pracowników = ci z godzinami + ci z samą nieobecnością (0 h)
  const employeeRows = useMemo(() => {
    const rows = [...(data?.by_employee ?? [])];
    const ids = new Set(rows.map((e) => e.id));
    for (const [id, list] of Object.entries(absByEmployee)) {
      if (!ids.has(id)) {
        rows.push({
          id,
          name: list[0]?.name ?? '?',
          total: 0,
          approved: null,
          draft: null,
          invoiced: null,
          labor_cost: null,
          projects: [],
        });
      }
    }
    return rows;
  }, [data?.by_employee, absByEmployee]);

  const canFinance = can('finance_view');
  const share = useCreateReportShare();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [includeAmounts, setIncludeAmounts] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const monthDelta = useMemo(() => {
    if (!data || prevTotal.data == null) return null;
    return data.total_hours - prevTotal.data;
  }, [data, prevTotal.data]);

  const openShare = () => {
    setShareTitle(`Raport ${monthYear(anchor)}`);
    setIncludeAmounts(false);
    setShareUrl('');
    setShareOpen(true);
  };

  const generateShare = () => {
    share.mutate(
      { from, to, title: shareTitle, includeAmounts: includeAmounts && canFinance },
      {
        onSuccess: (token) => setShareUrl(reportShareUrl(token)),
        onError: () => toast.error('Nie udało się utworzyć linku'),
      },
    );
  };

  const billableTotal = useMemo(
    () => (data?.by_project ?? []).reduce((s, p) => s + (p.billable ?? 0), 0),
    [data],
  );
  const laborTotal = useMemo(
    () => (data?.by_project ?? []).reduce((s, p) => s + (p.labor_cost ?? 0), 0),
    [data],
  );
  const profit = useMemo(
    () => (finance ? billableTotal - laborTotal - (data?.expenses ?? 0) : null),
    [finance, billableTotal, laborTotal, data?.expenses],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => setAnchor((a) => subMonths(a, 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthYear(anchor)}</p>
        <button
          type="button"
          aria-label="Następny miesiąc"
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => setAnchor((a) => addMonths(a, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {report.isLoading && <SkeletonList rows={5} />}

      {!report.isLoading && data && (
        <>
          <section className={cn('grid gap-3', finance ? 'grid-cols-2' : 'grid-cols-1')}>
            <Card className="flex flex-col gap-1 p-4">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Clock className="size-4" /> Godziny w miesiącu
              </span>
              <span className="tabular-nums text-xl font-semibold">
                {num(data.total_hours)} h
              </span>
              {monthDelta != null && (
                <span
                  className={cn(
                    'tabular-nums text-[11px]',
                    monthDelta > 0
                      ? 'text-success'
                      : monthDelta < 0
                        ? 'text-error'
                        : 'text-text-secondary',
                  )}
                >
                  {monthDelta === 0
                    ? 'tyle samo co w zeszłym miesiącu'
                    : `${monthDelta > 0 ? '+' : ''}${num(monthDelta)} h vs ${num(prevTotal.data ?? 0)} h w zeszłym`}
                </span>
              )}
            </Card>
            {finance && (
              <Card className="flex flex-col gap-1 p-4">
                <span className="text-xs text-text-secondary">Do fakturowania</span>
                <span className="tabular-nums text-xl font-semibold">
                  {moneyWhole(billableTotal)}
                </span>
                <span className="tabular-nums text-[11px] text-text-secondary">
                  koszt pracy {moneyWhole(laborTotal)}
                </span>
              </Card>
            )}
          </section>

          {finance && profit != null && (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-text-secondary">Zysk w tym miesiącu</p>
                <p className="tabular-nums text-[11px] text-text-secondary">
                  do fakturowania {moneyWhole(billableTotal)} − praca{' '}
                  {moneyWhole(laborTotal)} − paragony {moneyWhole(data.expenses ?? 0)}
                </p>
              </div>
              <span
                className={cn(
                  'tabular-nums shrink-0 text-xl font-bold',
                  profit >= 0 ? 'text-success' : 'text-error',
                )}
              >
                {profit >= 0 ? '+' : ''}
                {moneyWhole(profit)}
              </span>
            </Card>
          )}

          <SegmentedControl
            options={[
              { value: 'employees', label: 'Pracownicy' },
              { value: 'projects', label: 'Projekty' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {data.total_hours === 0 && (absences.data?.length ?? 0) === 0 && (
            <EmptyState icon={BarChart3} message="Brak godzin i nieobecności w tym miesiącu." />
          )}

          {tab === 'employees' && employeeRows.length > 0 && (
            <Card className="flex flex-col divide-y divide-line">
              {employeeRows.map((e) => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
                  absences={absByEmployee[e.id] ?? []}
                  finance={finance}
                  open={expanded === e.id}
                  onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                />
              ))}
            </Card>
          )}

          {tab === 'projects' && data.by_project.length > 0 && (
            <Card className="flex flex-col divide-y divide-line">
              {data.by_project.map((p) => (
                <ProjectRow key={p.id} project={p} finance={finance} />
              ))}
            </Card>
          )}

          <button
            type="button"
            className="press flex h-12 items-center justify-center gap-2 rounded-(--radius-input) bg-surface text-sm font-medium"
            onClick={openShare}
          >
            <Share2 className="size-5 text-text-secondary" /> Udostępnij raport linkiem
          </button>
        </>
      )}

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Udostępnij raport">
        {!shareUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Wygeneruj link do tego raportu — otwiera się bez logowania, w szacie
              firmy. Dane zostają zamrożone na moment utworzenia.
            </p>
            <Input
              label="Tytuł raportu"
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
            />
            {canFinance && (
              <Switch
                checked={includeAmounts}
                onChange={setIncludeAmounts}
                label="Dołącz kwoty"
                description="Koszt pracy i wartość do fakturowania. Wyłącz, jeśli udostępniasz komuś, kto ma widzieć tylko godziny."
              />
            )}
            <Button
              size="lg"
              fullWidth
              icon={<Link2 className="size-5" />}
              loading={share.isPending}
              onClick={generateShare}
            >
              Utwórz link
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
              <Link2 className="size-4 shrink-0 text-text-secondary" />
              <span className="min-w-0 flex-1 truncate text-xs">{shareUrl}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                icon={<Copy className="size-5" />}
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success('Link skopiowany');
                }}
              >
                Kopiuj link
              </Button>
              <Button
                variant="secondary"
                icon={<Share2 className="size-5" />}
                onClick={() => {
                  if (navigator.share) {
                    void navigator.share({ title: shareTitle, url: shareUrl });
                  } else {
                    void navigator.clipboard.writeText(shareUrl);
                    toast.success('Link skopiowany');
                  }
                }}
              >
                Udostępnij
              </Button>
            </div>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => window.open(`${shareUrl}?podglad=1`, '_blank')}
            >
              Otwórz podgląd
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function EmployeeRow({
  employee: e,
  absences,
  finance,
  open,
  onToggle,
}: {
  employee: ReportEmployee;
  absences: ReportAbsence[];
  finance: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="press flex items-center gap-3 p-3 text-left"
        onClick={onToggle}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <Users className="size-4.5 text-text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{e.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {(e.approved ?? 0) > 0 && (
              <Badge tone="success">{num(e.approved!)} h zatw.</Badge>
            )}
            {(e.draft ?? 0) > 0 && (
              <Badge tone="warning">{num(e.draft!)} h niezatwierdzone</Badge>
            )}
            {absences.map((a) => (
              <Badge key={a.type} tone={ABSENCE_TYPE_TONES[a.type]}>
                {ABSENCE_TYPE_LABELS[a.type]} {a.days} d
              </Badge>
            ))}
            {finance && e.labor_cost != null && (
              <span className="tabular-nums text-[11px] text-text-secondary">
                koszt {moneyWhole(e.labor_cost)}
              </span>
            )}
          </div>
        </div>
        <span className="tabular-nums shrink-0 text-base font-semibold">
          {num(e.total)} h
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-text-secondary transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (e.projects?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5 bg-surface/60 px-4 pt-1 pb-3">
          {e.projects!.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color ?? '#9E9E9E' }}
              />
              <span className="min-w-0 flex-1 truncate text-text-secondary">{p.name}</span>
              <span className="tabular-nums font-medium">{num(p.hours)} h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project: p, finance }: { project: ReportProject; finance: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div
        className="h-9 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: p.color ?? '#CC0000' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p.name}</p>
        <p className="tabular-nums mt-0.5 text-xs text-text-secondary">
          {num(p.total)} h • {p.employees}{' '}
          {p.employees === 1 ? 'pracownik' : 'pracowników'}
          {finance && p.hourly_rate != null && p.billing_type !== 'fixed'
            ? ` • ${num(p.hourly_rate)} kr/h`
            : ''}
        </p>
      </div>
      {finance && p.billable != null ? (
        <div className="text-right">
          <p className="tabular-nums text-sm font-semibold">{moneyWhole(p.billable)}</p>
          <p className="text-[11px] text-text-secondary">do faktury</p>
        </div>
      ) : (
        <span className="tabular-nums text-base font-semibold">{fmtHours(p.total)}</span>
      )}
    </div>
  );
}
