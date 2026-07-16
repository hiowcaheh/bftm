import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { CalendarOff, ChevronLeft, ChevronRight, CheckCheck, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate, hours as fmtHours, monthYear } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useProjects } from '@/features/projects/hooks';
import { useAbsences, useDeleteAbsence } from '@/features/absences/hooks';
import {
  ABSENCE_TYPE_TONES,
  type AbsenceWithEmployee,
} from '@/features/absences/types';
import { AbsenceFormSheet } from '@/features/absences/components/AbsenceFormSheet';
import { useApproveEntries, useEntries } from '../hooks';
import type { WorkHoursEntry } from '../types';
import { EntryList } from '../components/EntryList';
import { HoursFormSheet } from '../components/HoursFormSheet';
import { JournalGrid } from '../components/JournalGrid';

type View = 'journal' | 'list' | 'absences';
type Range = 'week' | 'month';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function TimesheetPage() {
  const { user, can } = useSession();
  const { t, tp, dateLocale } = useI18n();
  // „czw., 09.07" — kompaktowa etykieta dnia w modalu zatwierdzania
  const dayLabel = (isoDate: string) =>
    format(new Date(isoDate), 'EEEEEE, dd.MM', { locale: dateLocale });
  const seesAll = can('hours_view_all');
  const canApprove = can('hours_approve');

  const [view, setView] = useState<View>(seesAll ? 'journal' : 'list');
  const [range, setRange] = useState<Range>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [absenceFormOpen, setAbsenceFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WorkHoursEntry | null>(null);
  const [presetCell, setPresetCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [absenceToDelete, setAbsenceToDelete] = useState<AbsenceWithEmployee | null>(null);
  const canEditAll = user?.role === 'admin' || can('hours_edit_all');

  const { from, to } = useMemo(() => {
    if (range === 'week') {
      return {
        from: startOfWeek(anchor, { weekStartsOn: 1 }),
        to: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    }
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }, [anchor, range]);

  const entries = useEntries({
    from: iso(from),
    to: iso(to),
    projectId: projectFilter || undefined,
  });
  const absences = useAbsences(iso(from), iso(to));
  const employees = useEmployees();
  const projects = useProjects();
  const approve = useApproveEntries();
  const deleteAbsence = useDeleteAbsence();

  const shift = (dir: 1 | -1) => {
    setAnchor((a) =>
      range === 'week'
        ? dir === 1
          ? addDays(a, 7)
          : subDays(a, 7)
        : dir === 1
          ? addMonths(a, 1)
          : subMonths(a, 1),
    );
  };

  const periodLabel =
    range === 'week'
      ? `${t('ts.weekLabel', { n: getISOWeek(anchor) })} • ${fmtDate(from)} – ${fmtDate(to)}`
      : monthYear(anchor);

  const activeEmployees = (employees.data ?? []).filter((e) => e.active);
  const draftEntries = (entries.data ?? []).filter((e) => e.status === 'draft');
  const draftIds = draftEntries.map((e) => e.id);
  const totalHours = (entries.data ?? []).reduce((s, e) => s + e.hours, 0);

  // Podsumowanie do modalu zatwierdzania: pracownik → suma godzin, każdy dzień
  // z osobna + dni nieobecności w okresie (z podziałem na typy)
  const approveSummary = useMemo(() => {
    const byEmployee = new Map<
      string,
      { hours: number; days: Map<string, number>; absences: Map<string, number> }
    >();
    for (const e of draftEntries) {
      const name = e.employee?.full_name ?? '?';
      const row = byEmployee.get(name) ?? { hours: 0, days: new Map(), absences: new Map() };
      row.hours += e.hours;
      row.days.set(e.date, (row.days.get(e.date) ?? 0) + e.hours);
      byEmployee.set(name, row);
    }
    const periodFrom = iso(from);
    const periodTo = iso(to);
    for (const a of absences.data ?? []) {
      const name = a.employee?.full_name ?? '?';
      const start = a.date_from < periodFrom ? periodFrom : a.date_from;
      const end = a.date_to > periodTo ? periodTo : a.date_to;
      const daysCount =
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
      if (daysCount <= 0) continue;
      const row = byEmployee.get(name) ?? { hours: 0, days: new Map(), absences: new Map() };
      const label = t(`absence.${a.type}`);
      row.absences.set(label, (row.absences.get(label) ?? 0) + daysCount);
      byEmployee.set(name, row);
    }
    return [...byEmployee.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pl'));
  }, [draftEntries, absences.data, from, to, t]);

  const [confirmApprove, setConfirmApprove] = useState(false);
  const [editWarnEntry, setEditWarnEntry] = useState<WorkHoursEntry | null>(null);
  const [template, setTemplate] = useState<WorkHoursEntry | null>(null);

  // Duplikuj: nowy wpis wypełniony jak wzór, data ustawia się na dziś
  const requestDuplicate = (entry: WorkHoursEntry) => {
    setEditEntry(null);
    setTemplate(entry);
    setFormOpen(true);
  };

  // Wspólna ścieżka edycji: zatwierdzony/rozliczony wpis → najpierw ostrzeżenie
  const requestEdit = (entry: WorkHoursEntry) => {
    if (entry.status !== 'draft') {
      setEditWarnEntry(entry);
    } else {
      setEditEntry(entry);
      setFormOpen(true);
    }
  };
  const canDeleteAbsence = (a: AbsenceWithEmployee) =>
    can('absences_manage') || (a.employee_id === user?.id && a.date_from >= iso(new Date()));

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        options={[
          ...(seesAll ? [{ value: 'journal' as View, label: t('ts.journal') }] : []),
          { value: 'list' as View, label: t('ts.list') },
          { value: 'absences' as View, label: t('ts.absences') },
        ]}
        value={view}
        onChange={setView}
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
        <div className="text-center">
          <p className="tabular-nums text-sm font-semibold capitalize">{periodLabel}</p>
          <p className="tabular-nums text-xs text-text-secondary">{fmtHours(totalHours)}</p>
        </div>
        <button
          type="button"
          aria-label={t('ts.nextPeriod')}
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => shift(1)}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <SegmentedControl
          className="flex-1"
          options={[
            { value: 'week', label: t('ts.week') },
            { value: 'month', label: t('ts.month') },
          ]}
          value={range}
          onChange={setRange}
        />
        {view !== 'absences' && (
          <div className="flex-1">
            <Select
              aria-label={t('ts.projectFilter')}
              value={projectFilter}
              options={[
                { value: '', label: t('ts.allProjects') },
                ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
              onChange={(e) => setProjectFilter(e.target.value)}
            />
          </div>
        )}
      </div>

      {(entries.isLoading || absences.isLoading) && <SkeletonList rows={4} />}

      {!entries.isLoading && view === 'journal' && seesAll && (
        <>
          <JournalGrid
            from={from}
            to={to}
            entries={entries.data ?? []}
            absences={absences.data ?? []}
            employees={activeEmployees}
            onEditEntry={requestEdit}
            onAddForCell={
              canEditAll
                ? (employeeId, date) => {
                    setEditEntry(null);
                    setTemplate(null);
                    setPresetCell({ employeeId, date });
                    setFormOpen(true);
                  }
                : undefined
            }
          />
          {canApprove && draftIds.length > 0 && (
            <Button
              variant="secondary"
              icon={<CheckCheck className="size-5" />}
              onClick={() => setConfirmApprove(true)}
            >
              {t('ts.approvePeriod', { n: draftIds.length })}
            </Button>
          )}
        </>
      )}

      {!entries.isLoading && view === 'list' && (
        <EntryList
          entries={entries.data ?? []}
          showEmployee={seesAll}
          onEdit={requestEdit}
          onDuplicate={requestDuplicate}
        />
      )}

      {!absences.isLoading && view === 'absences' && (
        <>
          {(absences.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={CalendarOff}
              message={t('ts.noAbsences')}
              action={
                <Button icon={<Plus className="size-5" />} onClick={() => setAbsenceFormOpen(true)}>
                  {t('ts.reportAbsence')}
                </Button>
              }
            />
          ) : (
            <ListGroup>
              {absences.data?.map((a) => (
                <ListRow
                  key={a.id}
                  leading={
                    <Badge tone={ABSENCE_TYPE_TONES[a.type]}>
                      {t(`absence.${a.type}`)}
                    </Badge>
                  }
                  title={a.employee?.full_name ?? ''}
                  subtitle={[
                    a.date_from === a.date_to
                      ? fmtDate(a.date_from)
                      : `${fmtDate(a.date_from)} – ${fmtDate(a.date_to)}`,
                    a.note,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                  trailing={
                    canDeleteAbsence(a) ? (
                      <button
                        type="button"
                        aria-label={t('ts.deleteAbsence')}
                        className="press text-error"
                        onClick={() => setAbsenceToDelete(a)}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </ListGroup>
          )}
        </>
      )}

      <FAB
        label={view === 'absences' ? t('ts.reportAbsence') : t('ts.addHours')}
        onClick={() =>
          view === 'absences' ? setAbsenceFormOpen(true) : (setEditEntry(null), setFormOpen(true))
        }
      />

      <HoursFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditEntry(null);
          setTemplate(null);
          setPresetCell(null);
        }}
        entry={editEntry}
        template={template}
        presetEmployeeId={presetCell?.employeeId}
        presetDate={presetCell?.date}
      />
      <AbsenceFormSheet open={absenceFormOpen} onClose={() => setAbsenceFormOpen(false)} />
      <ConfirmDialog
        open={editWarnEntry !== null}
        title={t('ts.dayApprovedTitle')}
        description={
          editWarnEntry
            ? t('ts.editWarn', {
                name: editWarnEntry.employee?.full_name ?? '',
                date: fmtDate(editWarnEntry.date),
                hours: fmtHours(editWarnEntry.hours),
                status:
                  editWarnEntry.status === 'invoiced'
                    ? t('ts.statusInvoicedLc')
                    : t('ts.statusApprovedLc'),
              })
            : ''
        }
        confirmLabel={t('ts.editAnyway')}
        onConfirm={() => {
          if (editWarnEntry) {
            setEditEntry(editWarnEntry);
            setFormOpen(true);
          }
          setEditWarnEntry(null);
        }}
        onCancel={() => setEditWarnEntry(null)}
      />
      <ConfirmDialog
        open={confirmApprove}
        title={t('ts.approveTitle')}
        description={
          <div className="flex flex-col gap-2">
            <p>
              {t('ts.period')}: <span className="tabular-nums font-medium">{periodLabel}</span>
            </p>
            <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-xl bg-surface p-3">
              {approveSummary.map(([name, row]) => (
                <div key={name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-semibold text-text">{name}</span>
                    {row.hours > 0 && (
                      <span className="tabular-nums shrink-0 font-semibold text-text">
                        {fmtHours(row.hours)}
                      </span>
                    )}
                  </div>
                  {[...row.days.entries()]
                    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
                    .map(([day, dayHours]) => (
                      <div
                        key={day}
                        className="flex items-baseline justify-between gap-2 pl-2 text-xs text-text-secondary"
                      >
                        <span className="capitalize">{dayLabel(day)}</span>
                        <span className="tabular-nums">{fmtHours(dayHours)}</span>
                      </div>
                    ))}
                  {[...row.absences.entries()].map(([label, days]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-2 pl-2 text-xs text-text-secondary"
                    >
                      <span>{label}</span>
                      <span>
                        {days} {tp('ts.day', days)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs">{t('ts.approveNote')}</p>
          </div>
        }
        confirmLabel={t('ts.approve')}
        loading={approve.isPending}
        onConfirm={() =>
          approve.mutate(
            { ids: draftIds, periodLabel },
            { onSettled: () => setConfirmApprove(false) },
          )
        }
        onCancel={() => setConfirmApprove(false)}
      />
      <ConfirmDialog
        open={absenceToDelete !== null}
        title={t('ts.deleteAbsenceTitle')}
        description={
          absenceToDelete
            ? `${t(`absence.${absenceToDelete.type}`)}: ${fmtDate(absenceToDelete.date_from)} – ${fmtDate(absenceToDelete.date_to)}`
            : ''
        }
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteAbsence.isPending}
        onConfirm={() => {
          if (absenceToDelete) {
            deleteAbsence.mutate(absenceToDelete.id, {
              onSettled: () => setAbsenceToDelete(null),
            });
          }
        }}
        onCancel={() => setAbsenceToDelete(null)}
      />
    </div>
  );
}
