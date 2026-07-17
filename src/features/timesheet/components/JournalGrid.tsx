import { useMemo, useState } from 'react';
import { eachDayOfInterval, format, isToday, isWeekend } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { date as fmtDate, dateLong, hours, num } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import type { AbsenceWithEmployee } from '@/features/absences/types';
import { ABSENCE_TYPE_COLORS } from '@/features/absences/types';
import { useDeleteEntry } from '../hooks';
import { HOURS_STATUS_TONES, type WorkHoursEntry } from '../types';

interface JournalGridProps {
  from: Date;
  to: Date;
  entries: WorkHoursEntry[];
  absences: AbsenceWithEmployee[];
  employees: Array<{ id: string; full_name: string }>;
  onEditEntry?: (entry: WorkHoursEntry) => void;
  /** Klik w pustą komórkę → dodanie godzin z ustawionym pracownikiem i dniem. */
  onAddForCell?: (employeeId: string, date: string) => void;
}

interface CellInfo {
  sum: number;
  allApproved: boolean;
}

/**
 * Siatka dziennika: pracownicy × dni. Czerwona komórka = szkice,
 * zielona = wszystkie godziny zatwierdzone (do wypłaty). Kropka w kolorze
 * typu = nieobecność. Tap → szczegóły dnia z możliwością edycji wpisów.
 */
export function JournalGrid({
  from,
  to,
  entries,
  absences,
  employees,
  onEditEntry,
  onAddForCell,
}: JournalGridProps) {
  const days = useMemo(() => eachDayOfInterval({ start: from, end: to }), [from, to]);
  const [selected, setSelected] = useState<{ employeeId: string; date: string } | null>(null);
  const [toDelete, setToDelete] = useState<WorkHoursEntry | null>(null);
  const { user, can } = useSession();
  const { t, dateLocale } = useI18n();
  const deleteEntry = useDeleteEntry();

  const canModify = (entry: WorkHoursEntry): boolean => {
    if (user?.role === 'admin') return true;
    if (entry.status === 'invoiced') return false;
    if (can('hours_edit_all')) return true;
    return entry.employee_id === user?.id && entry.status === 'draft';
  };

  const hoursByCell = useMemo(() => {
    const map = new Map<string, CellInfo>();
    for (const e of entries) {
      const key = `${e.employee_id}|${e.date}`;
      const cell = map.get(key) ?? { sum: 0, allApproved: true };
      cell.sum += e.hours;
      if (e.status === 'draft') cell.allApproved = false;
      map.set(key, cell);
    }
    return map;
  }, [entries]);

  const absenceByCell = useMemo(() => {
    const map = new Map<string, AbsenceWithEmployee>();
    for (const a of absences) {
      for (const d of eachDayOfInterval({
        start: new Date(a.date_from),
        end: new Date(a.date_to),
      })) {
        map.set(`${a.employee_id}|${format(d, 'yyyy-MM-dd')}`, a);
      }
    }
    return map;
  }, [absences]);

  const employeeTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.employee_id, (map.get(e.employee_id) ?? 0) + e.hours);
    }
    return map;
  }, [entries]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.date, (map.get(e.date) ?? 0) + e.hours);
    }
    return map;
  }, [entries]);

  const selectedEntries = selected
    ? entries.filter(
        (e) => e.employee_id === selected.employeeId && e.date === selected.date,
      )
    : [];
  const selectedAbsence = selected
    ? absenceByCell.get(`${selected.employeeId}|${selected.date}`)
    : undefined;
  const selectedEmployee = employees.find((e) => e.id === selected?.employeeId);

  return (
    <div className="overflow-hidden rounded-(--radius-card) bg-white shadow-(--shadow-card)">
      {/* data-noswipe: przewijanie siatki nie przełącza zakładek aplikacji */}
      <div className="overflow-x-auto" data-noswipe>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 min-w-24 bg-white p-2 text-left font-medium text-text-secondary">
                {t('ts.employee')}
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className={cn(
                    'min-w-9 p-1 text-center font-medium',
                    isToday(d)
                      ? 'text-accent'
                      : isWeekend(d)
                        ? 'text-text-secondary/50'
                        : 'text-text-secondary',
                  )}
                >
                  <div className="capitalize">{format(d, 'EEEEEE', { locale: dateLocale })}</div>
                  <div className="tabular-nums">{format(d, 'd')}</div>
                </th>
              ))}
              <th className="min-w-12 p-2 text-right font-semibold text-text-secondary">
                {t('ts.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-line last:border-0">
                <td className="sticky left-0 z-10 max-w-28 truncate bg-white p-2 font-medium">
                  {emp.full_name.split(' ')[0]}
                </td>
                {days.map((d) => {
                  const key = `${emp.id}|${format(d, 'yyyy-MM-dd')}`;
                  const cell = hoursByCell.get(key);
                  const absence = absenceByCell.get(key);
                  return (
                    <td key={key} className="p-0.5 text-center">
                      <button
                        type="button"
                        className={cn(
                          'tabular-nums flex h-9 w-full min-w-8 items-center justify-center rounded-lg font-semibold',
                          cell &&
                            (cell.allApproved
                              ? 'bg-success-soft text-success'
                              : 'bg-accent-soft text-accent'),
                          !cell && absence && 'text-white',
                          !cell && !absence && isWeekend(d) && 'bg-surface/50',
                          !cell && !absence && onAddForCell && 'active:bg-surface',
                        )}
                        style={
                          !cell && absence
                            ? { backgroundColor: ABSENCE_TYPE_COLORS[absence.type] }
                            : undefined
                        }
                        onClick={() => {
                          const dateIso = format(d, 'yyyy-MM-dd');
                          if (cell || absence) {
                            setSelected({ employeeId: emp.id, date: dateIso });
                          } else {
                            onAddForCell?.(emp.id, dateIso);
                          }
                        }}
                      >
                        {cell ? num(cell.sum) : absence ? '•' : ''}
                      </button>
                    </td>
                  );
                })}
                <td className="tabular-nums p-2 text-right font-semibold">
                  {employeeTotals.get(emp.id) ? num(employeeTotals.get(emp.id)!) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-surface/50">
              <td className="sticky left-0 z-10 bg-surface p-2 font-semibold">{t('ts.total')}</td>
              {days.map((d) => {
                const total = dayTotals.get(format(d, 'yyyy-MM-dd'));
                return (
                  <td
                    key={d.toISOString()}
                    className="tabular-nums p-1 text-center font-semibold"
                  >
                    {total ? num(total) : ''}
                  </td>
                );
              })}
              <td className="tabular-nums p-2 text-right font-bold">
                {num(entries.reduce((s, e) => s + e.hours, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-accent-soft ring-1 ring-accent/30" />{' '}
          {t('ts.legendDraft')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-success-soft ring-1 ring-success/30" />{' '}
          {t('ts.legendApproved')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded" style={{ backgroundColor: ABSENCE_TYPE_COLORS.sick }} />{' '}
          {t('ts.legendAbsence')}
        </span>
      </div>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selectedEmployee?.full_name ?? ''} — ${dateLong(selected.date)}` : ''}
      >
        <div className="flex flex-col gap-3">
          {selectedAbsence && (
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor: `${ABSENCE_TYPE_COLORS[selectedAbsence.type]}1A` }}
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: ABSENCE_TYPE_COLORS[selectedAbsence.type] }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: ABSENCE_TYPE_COLORS[selectedAbsence.type] }}
                >
                  {t(`absence.${selectedAbsence.type}`)}
                </p>
                <p className="text-xs text-text-secondary">
                  {selectedAbsence.date_from === selectedAbsence.date_to
                    ? fmtDate(selectedAbsence.date_from)
                    : `${fmtDate(selectedAbsence.date_from)} – ${fmtDate(selectedAbsence.date_to)}`}
                  {selectedAbsence.note ? ` • ${selectedAbsence.note}` : ''}
                </p>
              </div>
            </div>
          )}
          {selectedEntries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <div
                className="h-8 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: e.project?.color ?? '#CC0000' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.project?.name}</p>
                {(e.activity || e.description) && (
                  <p className="truncate text-xs text-text-secondary">
                    {[e.activity?.name, e.description].filter(Boolean).join(' • ')}
                  </p>
                )}
                <Badge tone={HOURS_STATUS_TONES[e.status]} className="mt-1">
                  {t(`hstatus.${e.status}`)}
                </Badge>
              </div>
              <span className="tabular-nums shrink-0 text-sm font-semibold">
                {hours(e.hours)}
              </span>
              {onEditEntry && canModify(e) && (
                <button
                  type="button"
                  aria-label={t('ts.editEntry')}
                  className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
                  onClick={() => {
                    setSelected(null);
                    onEditEntry(e);
                  }}
                >
                  <Pencil className="size-4 text-text-secondary" />
                </button>
              )}
              {canModify(e) && (
                <button
                  type="button"
                  aria-label={t('common.delete')}
                  className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-error-soft"
                  onClick={() => setToDelete(e)}
                >
                  <Trash2 className="size-4 text-error" />
                </button>
              )}
            </div>
          ))}
          {selectedEntries.length === 0 && !selectedAbsence && (
            <p className="text-sm text-text-secondary">{t('ts.noEntries')}</p>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={t('ts.deleteEntryTitle')}
        description={
          toDelete
            ? `${toDelete.project?.name ?? ''} • ${hours(toDelete.hours)} — ${t('ts.cantUndo')}`
            : ''
        }
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteEntry.isPending}
        onConfirm={() => {
          if (toDelete) {
            deleteEntry.mutate(toDelete.id, {
              onSuccess: () => setToDelete(null),
            });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
