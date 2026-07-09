import { useMemo, useState } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjectEntries } from '@/features/timesheet/hooks';
import { useActivities, useCreateActivity, useDeleteActivity } from '../hooks';
import type { ProjectActivity } from '../types';

/**
 * Aktywności (usługi/etapy) projektu: zarządzanie listą + podsumowanie
 * „kto co robił i ile godzin" na podstawie wpisów godzin.
 */
export function ProjectActivitiesSection({ projectId }: { projectId: string }) {
  const { can } = useSession();
  const canEdit = can('projects_edit');
  const activities = useActivities(projectId);
  const entries = useProjectEntries(projectId);
  const createActivity = useCreateActivity(projectId);
  const deleteActivity = useDeleteActivity(projectId);
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<ProjectActivity | null>(null);

  // aktywność → (pracownik → suma godzin)
  const breakdown = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of entries.data ?? []) {
      const activityId = e.activity_id ?? 'none';
      const byEmployee = map.get(activityId) ?? new Map<string, number>();
      const employeeName = e.employee?.full_name ?? '?';
      byEmployee.set(employeeName, (byEmployee.get(employeeName) ?? 0) + e.hours);
      map.set(activityId, byEmployee);
    }
    return map;
  }, [entries.data]);

  const totalFor = (activityId: string) =>
    [...(breakdown.get(activityId)?.values() ?? [])].reduce((s, h) => s + h, 0);

  const add = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    createActivity.mutate(trimmed, { onSuccess: () => setName('') });
  };

  const list = activities.data ?? [];
  const noActivityHours = totalFor('none');

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="size-5 text-accent" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">Aktywności</h2>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-text-secondary">
          Dodaj aktywności (np. „Malowanie", „Montaż fasady", „Prace dodatkowe") — pracownicy
          będą je wybierać przy wpisywaniu godzin i zobaczysz, kto co robił.
        </p>
      )}

      {list.map((activity) => {
        const byEmployee = breakdown.get(activity.id);
        const total = totalFor(activity.id);
        return (
          <div key={activity.id} className="rounded-xl bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold">{activity.name}</p>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums text-sm font-semibold">
                  {total > 0 ? `${num(total)} h` : '—'}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Usuń aktywność ${activity.name}`}
                    className="press text-text-secondary"
                    onClick={() => setToDelete(activity)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
            {byEmployee && byEmployee.size > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5 border-t border-line pt-1.5">
                {[...byEmployee.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([employeeName, sum]) => (
                    <div key={employeeName} className="flex justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-text-secondary">
                        {employeeName}
                      </span>
                      <span className="tabular-nums shrink-0">{num(sum)} h</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {noActivityHours > 0 && list.length > 0 && (
        <p className="text-xs text-text-secondary">
          Bez przypisanej aktywności: {num(noActivityHours)} h (starsze wpisy)
        </p>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            value={name}
            placeholder="Nowa aktywność, np. Malowanie"
            className="h-11 min-w-0 flex-1 rounded-(--radius-input) border border-line bg-white px-3.5 text-[1rem] placeholder:text-text-secondary/60 focus:border-accent focus:outline-none"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button
            icon={<Plus className="size-5" />}
            aria-label="Dodaj aktywność"
            loading={createActivity.isPending}
            disabled={name.trim().length < 2}
            onClick={add}
          />
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Usunąć aktywność?"
        description={`„${toDelete?.name}" zniknie z listy wyboru. Istniejące wpisy godzin zostaną — stracą tylko przypisanie do tej aktywności.`}
        confirmLabel="Usuń"
        destructive
        loading={deleteActivity.isPending}
        onConfirm={() => {
          if (toDelete) {
            deleteActivity.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
