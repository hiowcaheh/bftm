import { useMemo, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { hours as fmtHours, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjectEntries } from '@/features/timesheet/hooks';
import { HoursFormSheet } from '@/features/timesheet/components/HoursFormSheet';
import type { ProjectWithClient } from '../types';

/** Sekcja Godziny na karcie projektu: suma, postęp vs budżet, podział na osoby. */
export function ProjectHoursSection({ project }: { project: ProjectWithClient }) {
  const entries = useProjectEntries(project.id);
  const { can } = useSession();
  const [formOpen, setFormOpen] = useState(false);

  const total = useMemo(
    () => (entries.data ?? []).reduce((s, e) => s + e.hours, 0),
    [entries.data],
  );

  const byEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries.data ?? []) {
      const name = e.employee?.full_name ?? '?';
      map.set(name, (map.get(name) ?? 0) + e.hours);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries.data]);

  const budget = project.estimated_hours;
  const progress = budget && budget > 0 ? Math.min(100, (total / budget) * 100) : null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">Godziny</h2>
        </div>
        {can('hours_add_own') && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setFormOpen(true)}
          >
            Dodaj
          </Button>
        )}
      </div>

      <p className="tabular-nums text-lg font-semibold">
        {fmtHours(total)}
        {budget != null && (
          <span className="ml-1 text-sm font-normal text-text-secondary">
            / {num(budget)} h budżetu
          </span>
        )}
      </p>

      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? 'var(--color-error)' : 'var(--color-accent)',
            }}
          />
        </div>
      )}

      {byEmployee.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          {byEmployee.map(([name, sum]) => (
            <div key={name} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{name}</span>
              <span className="tabular-nums shrink-0 text-sm font-medium">{num(sum)} h</span>
            </div>
          ))}
        </div>
      )}

      <HoursFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        entry={null}
        presetProjectId={project.id}
      />
    </Card>
  );
}
