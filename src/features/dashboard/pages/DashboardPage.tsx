import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, Clock, Receipt, Banknote, Plus, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FAB } from '@/components/ui/FAB';
import { date as fmtDate, hours, moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { HoursFormSheet } from '@/features/timesheet/components/HoursFormSheet';
import { ABSENCE_TYPE_LABELS, ABSENCE_TYPE_TONES } from '@/features/absences/types';
import type { AbsenceType } from '@/types/database';
import { useDashboardKpi, useRecentEntries, useToday } from '../hooks';

export default function DashboardPage() {
  const kpi = useDashboardKpi();
  const today = useToday();
  const recent = useRecentEntries();
  const navigate = useNavigate();
  const { can } = useSession();
  const seesAll = can('hours_view_all');
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
    {
      label: 'Koszty w tym miesiącu',
      value: moneyWhole(0),
      icon: Receipt,
      demo: true,
      onClick: () => navigate('/koszty'),
    },
    {
      label: 'Wartość w toku',
      value: moneyWhole(0),
      icon: Banknote,
      demo: true,
      onClick: () => navigate('/projekty'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold">Pulpit</h1>
      </header>

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

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{seesAll ? 'Dziś w pracy' : 'Twój dzień'}</h2>
        <Card className="flex flex-col gap-2 p-4">
          {today.data && today.data.entries.length === 0 && today.data.absences.length === 0 && (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 text-sm text-text-secondary">
                <Sun className="size-5" />
                {seesAll
                  ? 'Nikt jeszcze nie wpisał dziś godzin.'
                  : 'Nie masz jeszcze wpisu na dziś.'}
              </p>
              {!seesAll && (
                <Button size="sm" onClick={() => setHoursFormOpen(true)}>
                  Dodaj dzisiejsze godziny
                </Button>
              )}
            </div>
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
      </section>

      {(recent.data?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Ostatnie wpisy</h2>
          <Card className="flex flex-col divide-y divide-line">
            {recent.data?.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3">
                <div
                  className="h-8 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: e.projectColor ?? '#CC0000' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.employeeName}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {e.projectName} • {fmtDate(e.date)}
                  </p>
                </div>
                <span className="tabular-nums shrink-0 text-sm font-semibold">
                  {num(e.hours)} h
                </span>
              </div>
            ))}
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
