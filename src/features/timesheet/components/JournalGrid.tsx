import { useMemo, useState } from 'react';
import { eachDayOfInterval, format, isToday, isWeekend } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { dateLong, hours, num } from '@/lib/format';
import type { AbsenceWithEmployee } from '@/features/absences/types';
import {
  ABSENCE_TYPE_COLORS,
  ABSENCE_TYPE_LABELS,
} from '@/features/absences/types';
import type { WorkHoursEntry } from '../types';

interface JournalGridProps {
  from: Date;
  to: Date;
  entries: WorkHoursEntry[];
  absences: AbsenceWithEmployee[];
  employees: Array<{ id: string; full_name: string }>;
}

/**
 * Siatka dziennika: pracownicy × dni. Komórka pokazuje sumę godzin albo
 * kolorową kropkę nieobecności; tap otwiera szczegóły dnia. Wiersz sum
 * dziennych na dole, suma na pracownika po prawej.
 */
export function JournalGrid({ from, to, entries, absences, employees }: JournalGridProps) {
  const days = useMemo(() => eachDayOfInterval({ start: from, end: to }), [from, to]);
  const [selected, setSelected] = useState<{ employeeId: string; date: string } | null>(null);

  const hoursByCell = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = `${e.employee_id}|${e.date}`;
      map.set(key, (map.get(key) ?? 0) + e.hours);
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 min-w-24 bg-white p-2 text-left font-medium text-text-secondary">
                Pracownik
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
                  <div className="capitalize">{format(d, 'EEEEEE', { locale: pl })}</div>
                  <div className="tabular-nums">{format(d, 'd')}</div>
                </th>
              ))}
              <th className="min-w-12 p-2 text-right font-semibold text-text-secondary">Σ</th>
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
                  const cellHours = hoursByCell.get(key);
                  const absence = absenceByCell.get(key);
                  return (
                    <td key={key} className="p-0.5 text-center">
                      <button
                        type="button"
                        className={cn(
                          'tabular-nums flex h-9 w-full min-w-8 items-center justify-center rounded-lg',
                          cellHours && 'bg-accent-soft font-semibold text-accent',
                          !cellHours && absence && 'text-white',
                          !cellHours && !absence && isWeekend(d) && 'bg-surface/50',
                        )}
                        style={
                          !cellHours && absence
                            ? { backgroundColor: ABSENCE_TYPE_COLORS[absence.type] }
                            : undefined
                        }
                        onClick={() =>
                          (cellHours || absence) &&
                          setSelected({ employeeId: emp.id, date: format(d, 'yyyy-MM-dd') })
                        }
                      >
                        {cellHours ? num(cellHours) : absence ? '•' : ''}
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
              <td className="sticky left-0 z-10 bg-surface p-2 font-semibold">Σ</td>
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

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selectedEmployee?.full_name ?? ''} — ${dateLong(selected.date)}` : ''}
      >
        <div className="flex flex-col gap-3">
          {selectedAbsence && (
            <Badge
              tone="neutral"
              className="self-start text-white"
            >
              <span
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: ABSENCE_TYPE_COLORS[selectedAbsence.type] }}
              >
                Nieobecność: {ABSENCE_TYPE_LABELS[selectedAbsence.type]}
              </span>
            </Badge>
          )}
          {selectedEntries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <div
                className="h-8 w-1.5 rounded-full"
                style={{ backgroundColor: e.project?.color ?? '#CC0000' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.project?.name}</p>
                {(e.activity || e.description) && (
                  <p className="truncate text-xs text-text-secondary">
                    {[e.activity?.name, e.description].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
              <span className="tabular-nums text-sm font-semibold">{hours(e.hours)}</span>
            </div>
          ))}
          {selectedEntries.length === 0 && !selectedAbsence && (
            <p className="text-sm text-text-secondary">Brak wpisów.</p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
