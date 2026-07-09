import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
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
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useProjects } from '@/features/projects/hooks';
import { useAbsences, useDeleteAbsence } from '@/features/absences/hooks';
import {
  ABSENCE_TYPE_LABELS,
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
  const seesAll = can('hours_view_all');
  const canApprove = can('hours_approve');

  const [view, setView] = useState<View>(seesAll ? 'journal' : 'list');
  const [range, setRange] = useState<Range>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [absenceFormOpen, setAbsenceFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WorkHoursEntry | null>(null);
  const [absenceToDelete, setAbsenceToDelete] = useState<AbsenceWithEmployee | null>(null);

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
    range === 'week' ? `${fmtDate(from)} – ${fmtDate(to)}` : monthYear(anchor);

  const activeEmployees = (employees.data ?? []).filter((e) => e.active);
  const draftIds = (entries.data ?? []).filter((e) => e.status === 'draft').map((e) => e.id);
  const totalHours = (entries.data ?? []).reduce((s, e) => s + e.hours, 0);
  const canDeleteAbsence = (a: AbsenceWithEmployee) =>
    can('absences_manage') || (a.employee_id === user?.id && a.date_from >= iso(new Date()));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Godziny</h1>

      <SegmentedControl
        options={[
          ...(seesAll ? [{ value: 'journal' as View, label: 'Dziennik' }] : []),
          { value: 'list' as View, label: 'Lista' },
          { value: 'absences' as View, label: 'Nieobecności' },
        ]}
        value={view}
        onChange={setView}
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Poprzedni okres"
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
          aria-label="Następny okres"
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
            { value: 'week', label: 'Tydzień' },
            { value: 'month', label: 'Miesiąc' },
          ]}
          value={range}
          onChange={setRange}
        />
        {view !== 'absences' && (
          <div className="flex-1">
            <Select
              aria-label="Filtr projektu"
              value={projectFilter}
              options={[
                { value: '', label: 'Wszystkie projekty' },
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
          />
          {canApprove && draftIds.length > 0 && (
            <Button
              variant="secondary"
              icon={<CheckCheck className="size-5" />}
              loading={approve.isPending}
              onClick={() => approve.mutate(draftIds)}
            >
              Zatwierdź szkice z okresu ({draftIds.length})
            </Button>
          )}
        </>
      )}

      {!entries.isLoading && view === 'list' && (
        <EntryList
          entries={entries.data ?? []}
          showEmployee={seesAll}
          onEdit={(entry) => {
            setEditEntry(entry);
            setFormOpen(true);
          }}
        />
      )}

      {!absences.isLoading && view === 'absences' && (
        <>
          {(absences.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={CalendarOff}
              message="Brak nieobecności w wybranym okresie."
              action={
                <Button icon={<Plus className="size-5" />} onClick={() => setAbsenceFormOpen(true)}>
                  Zgłoś nieobecność
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
                      {ABSENCE_TYPE_LABELS[a.type]}
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
                        aria-label="Usuń nieobecność"
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
        label={view === 'absences' ? 'Zgłoś nieobecność' : 'Dodaj godziny'}
        onClick={() =>
          view === 'absences' ? setAbsenceFormOpen(true) : (setEditEntry(null), setFormOpen(true))
        }
      />

      <HoursFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditEntry(null);
        }}
        entry={editEntry}
      />
      <AbsenceFormSheet open={absenceFormOpen} onClose={() => setAbsenceFormOpen(false)} />
      <ConfirmDialog
        open={absenceToDelete !== null}
        title="Usunąć nieobecność?"
        description={
          absenceToDelete
            ? `${ABSENCE_TYPE_LABELS[absenceToDelete.type]}: ${fmtDate(absenceToDelete.date_from)} – ${fmtDate(absenceToDelete.date_to)}`
            : ''
        }
        confirmLabel="Usuń"
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
