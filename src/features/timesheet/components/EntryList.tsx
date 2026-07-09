import { useMemo, useState } from 'react';
import { Clock, Pencil, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { dateLong, hours } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useCreateEntry, useDeleteEntry } from '../hooks';
import {
  HOURS_STATUS_LABELS,
  HOURS_STATUS_TONES,
  type WorkHoursEntry,
} from '../types';

interface EntryListProps {
  entries: WorkHoursEntry[];
  showEmployee: boolean;
  onEdit: (entry: WorkHoursEntry) => void;
}

/** Lista wpisów pogrupowana po dniach; tap → akcje (edytuj/duplikuj/usuń). */
export function EntryList({ entries, showEmployee, onEdit }: EntryListProps) {
  const { user, can } = useSession();
  const deleteEntry = useDeleteEntry();
  const duplicate = useCreateEntry();
  const [selected, setSelected] = useState<WorkHoursEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, WorkHoursEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const canModify = (entry: WorkHoursEntry): boolean => {
    if (user?.role === 'admin') return true;
    if (entry.status === 'invoiced') return false;
    if (can('hours_edit_all')) return true;
    return entry.employee_id === user?.id && entry.status === 'draft';
  };

  if (entries.length === 0) {
    return <EmptyState icon={Clock} message="Brak wpisów w wybranym okresie." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, dayEntries]) => (
        <section key={date} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="text-xs font-semibold text-text-secondary capitalize">
              {dateLong(date)}
            </h3>
            <span className="tabular-nums text-xs font-semibold">
              {hours(dayEntries.reduce((s, e) => s + e.hours, 0))}
            </span>
          </div>
          <ListGroup>
            {dayEntries.map((entry) => (
              <ListRow
                key={entry.id}
                leading={
                  <div
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: entry.project?.color ?? '#CC0000' }}
                  />
                }
                title={
                  <span className="flex items-center gap-2">
                    {showEmployee ? entry.employee?.full_name : entry.project?.name}
                    {entry.status !== 'draft' && (
                      <Badge tone={HOURS_STATUS_TONES[entry.status]}>
                        {HOURS_STATUS_LABELS[entry.status]}
                      </Badge>
                    )}
                  </span>
                }
                subtitle={
                  showEmployee
                    ? [entry.project?.name, entry.description].filter(Boolean).join(' • ')
                    : entry.description || undefined
                }
                trailing={<span className="font-semibold text-text">{hours(entry.hours)}</span>}
                onClick={() => setSelected(entry)}
              />
            ))}
          </ListGroup>
        </section>
      ))}

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${hours(selected.hours)} — ${selected.project?.name ?? ''}` : ''}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              {selected.employee?.full_name} • {dateLong(selected.date)}
              {selected.description && (
                <>
                  <br />
                  {selected.description}
                </>
              )}
            </p>
            {canModify(selected) ? (
              <>
                <button
                  type="button"
                  className="press flex h-12 items-center gap-3 rounded-(--radius-input) bg-surface px-4 text-sm font-medium"
                  onClick={() => {
                    const entry = selected;
                    setSelected(null);
                    onEdit(entry);
                  }}
                >
                  <Pencil className="size-5 text-text-secondary" /> Edytuj
                </button>
                <button
                  type="button"
                  className="press flex h-12 items-center gap-3 rounded-(--radius-input) bg-surface px-4 text-sm font-medium"
                  onClick={() => {
                    duplicate.mutate({
                      project_id: selected.project_id,
                      employee_id: selected.employee_id,
                      date: selected.date,
                      hours: selected.hours,
                      description: selected.description,
                      created_by: user?.id ?? null,
                    });
                    setSelected(null);
                  }}
                >
                  <Copy className="size-5 text-text-secondary" /> Duplikuj
                </button>
                <button
                  type="button"
                  className="press flex h-12 items-center gap-3 rounded-(--radius-input) bg-error-soft px-4 text-sm font-medium text-error"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-5" /> Usuń
                </button>
              </>
            ) : (
              <p className="text-xs text-text-secondary">
                {selected.status === 'invoiced'
                  ? 'Wpis rozliczony — zmiany może wprowadzać tylko administrator.'
                  : 'Nie masz uprawnień do edycji tego wpisu.'}
              </p>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć wpis godzin?"
        description="Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        destructive
        loading={deleteEntry.isPending}
        onConfirm={() => {
          if (selected) {
            deleteEntry.mutate(selected.id, {
              onSuccess: () => {
                setConfirmDelete(false);
                setSelected(null);
              },
            });
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
