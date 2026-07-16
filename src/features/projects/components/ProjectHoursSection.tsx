import { useMemo, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { hours as fmtHours, num } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjectEntries } from '@/features/timesheet/hooks';
import { HoursFormSheet } from '@/features/timesheet/components/HoursFormSheet';
import type { ProjectWithClient } from '../types';

/** Sekcja Godziny na karcie projektu: suma, postęp vs budżet, podział na osoby. */
export function ProjectHoursSection({ project }: { project: ProjectWithClient }) {
  const entries = useProjectEntries(project.id);
  const { can } = useSession();
  const t = useT();
  const [formOpen, setFormOpen] = useState(false);

  const total = useMemo(
    () => (entries.data ?? []).reduce((s, e) => s + e.hours, 0),
    [entries.data],
  );

  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; avatar_path: string | null; hours: number }>();
    for (const e of entries.data ?? []) {
      const name = e.employee?.full_name ?? '?';
      const prev = map.get(name);
      map.set(name, {
        name,
        avatar_path: e.employee?.avatar_path ?? prev?.avatar_path ?? null,
        hours: (prev?.hours ?? 0) + e.hours,
      });
    }
    return [...map.values()].sort((a, b) => b.hours - a.hours);
  }, [entries.data]);

  const budget = project.estimated_hours;
  const progress = budget && budget > 0 ? Math.min(100, (total / budget) * 100) : null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">{t('proj.hoursLabel')}</h2>
        </div>
        {can('hours_add_own') && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setFormOpen(true)}
          >
            {t('common.add')}
          </Button>
        )}
      </div>

      <p className="tabular-nums text-lg font-semibold">
        {fmtHours(total)}
        {budget != null && (
          <span className="ml-1 text-sm font-normal text-text-secondary">
            {t('proj.budgetSuffix', { n: num(budget) })}
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
        <div className="flex flex-col gap-2 border-t border-line pt-2.5">
          {byEmployee.map((emp) => (
            <div key={emp.name} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={emp.name} path={emp.avatar_path} size="sm" />
                <span className="min-w-0 truncate text-sm">{emp.name}</span>
              </div>
              <span className="tabular-nums shrink-0 text-sm font-medium">{num(emp.hours)} h</span>
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
