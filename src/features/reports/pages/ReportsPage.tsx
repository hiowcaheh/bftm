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
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { hours as fmtHours, moneyWhole, monthYear, num } from '@/lib/format';
import { useHoursReport } from '../hooks';
import type { ReportEmployee, ReportProject } from '../api';

type Tab = 'employees' | 'projects';
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function ReportsPage() {
  const [anchor, setAnchor] = useState(new Date());
  const [tab, setTab] = useState<Tab>('employees');
  const [expanded, setExpanded] = useState<string | null>(null);

  const from = iso(startOfMonth(anchor));
  const to = iso(endOfMonth(anchor));
  const report = useHoursReport(from, to);
  const data = report.data;
  const finance = data?.finance ?? false;

  const billableTotal = useMemo(
    () => (data?.by_project ?? []).reduce((s, p) => s + (p.billable ?? 0), 0),
    [data],
  );
  const laborTotal = useMemo(
    () => (data?.by_project ?? []).reduce((s, p) => s + (p.labor_cost ?? 0), 0),
    [data],
  );

  const exportReport = () => {
    if (!data) return;
    const lines: string[] = [`Raport godzin — ${monthYear(anchor)}`, '', 'PRACOWNICY'];
    for (const e of data.by_employee) {
      const parts = (e.projects ?? []).map((p) => `${p.name} ${num(p.hours)}h`).join(', ');
      lines.push(
        `${e.name}: ${num(e.total)}h${finance && e.labor_cost != null ? ` (koszt ${moneyWhole(e.labor_cost)})` : ''}${parts ? ` — ${parts}` : ''}`,
      );
    }
    lines.push('', 'PROJEKTY');
    for (const p of data.by_project) {
      lines.push(
        `${p.name}: ${num(p.total)}h${finance && p.billable != null ? ` — do fakturowania ${moneyWhole(p.billable)}` : ''}`,
      );
    }
    lines.push('', `Razem: ${num(data.total_hours)}h`);
    if (finance) lines.push(`Do fakturowania: ${moneyWhole(billableTotal)}`);
    const text = lines.join('\n');
    if (navigator.share) {
      void navigator.share({ title: `Raport ${monthYear(anchor)}`, text });
    } else {
      void navigator.clipboard.writeText(text);
      toast.success('Raport skopiowany do schowka');
    }
  };

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

          <SegmentedControl
            options={[
              { value: 'employees', label: 'Pracownicy' },
              { value: 'projects', label: 'Projekty' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {data.total_hours === 0 && (
            <EmptyState icon={BarChart3} message="Brak godzin w tym miesiącu." />
          )}

          {tab === 'employees' && data.by_employee.length > 0 && (
            <Card className="flex flex-col divide-y divide-line">
              {data.by_employee.map((e) => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
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
            onClick={exportReport}
          >
            <Share2 className="size-5 text-text-secondary" /> Udostępnij / kopiuj raport
          </button>
        </>
      )}
    </div>
  );
}

function EmployeeRow({
  employee: e,
  finance,
  open,
  onToggle,
}: {
  employee: ReportEmployee;
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
            {(e.draft ?? 0) > 0 && <Badge tone="warning">{num(e.draft!)} h szkic</Badge>}
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
