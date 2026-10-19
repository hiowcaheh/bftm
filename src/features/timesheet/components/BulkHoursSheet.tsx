import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { hours as fmtHours } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useActivities, useProjects } from '@/features/projects/hooks';
import { hasAbsenceOnDate } from '@/features/absences/api';
import { useCreateEntries } from '../hooks';
import { byRecent, rememberProject } from '../recentProjects';
import { DayPickerField } from './DayPickerField';

const firstName = (full: string) => full.split(' ')[0] ?? full;

/**
 * Masowe dodawanie godzin (flaga hours_bulk_add): te same godziny, projekt
 * i data dla kilku osób — każda dostaje osobny wpis, edytowalny pojedynczo.
 */
export function BulkHoursSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, tp } = useI18n();
  const { user } = useSession();
  const employees = useEmployees();
  const projects = useProjects();
  const create = useCreateEntries();

  const [selected, setSelected] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [hoursValue, setHoursValue] = useState(8);
  const [description, setDescription] = useState('');
  const [checking, setChecking] = useState(false);

  const activities = useActivities(projectId, open && !!projectId);
  const projectActivities = activities.data ?? [];

  useEffect(() => {
    if (open) {
      setSelected(user?.id ? [user.id] : []);
      setProjectId('');
      setActivityId('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setHoursValue(8);
      setDescription('');
    }
  }, [open, user?.id]);

  // Aktywni, zalogowany na początku listy
  const people = useMemo(
    () =>
      (employees.data ?? [])
        .filter((e) => e.active)
        .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0)),
    [employees.data, user?.id],
  );

  const projectOptions = useMemo(
    () =>
      byRecent((projects.data ?? []).filter((p) => p.status === 'active')).map((p) => ({
        value: p.id,
        label: p.name,
      })),
    [projects.data],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const nameOf = (id: string) => firstName(people.find((p) => p.id === id)?.full_name ?? '?');

  const save = async () => {
    if (selected.length === 0 || !user) return;
    if (!projectId) {
      toast.error(t('ts.errProject'));
      return;
    }
    if (projectActivities.length > 0 && !activityId) {
      toast.error(t('ts.errActivity'));
      return;
    }
    // Ostrzeżenie (nieblokujące) — jak w zwykłym formularzu, ale dla każdej osoby
    setChecking(true);
    const absent = await Promise.all(selected.map((id) => hasAbsenceOnDate(id, date)));
    setChecking(false);
    const absentNames = selected.filter((_, i) => absent[i]).map(nameOf);
    if (absentNames.length > 0) {
      toast.info(t('ts.bulkAbsenceWarn', { names: absentNames.join(', ') }));
    }

    create.mutate(
      selected.map((employeeId) => ({
        project_id: projectId,
        employee_id: employeeId,
        activity_id: activityId || null,
        date,
        hours: hoursValue,
        description: description.trim() || null,
        created_by: user.id,
      })),
      {
        onSuccess: () => {
          rememberProject(projectId);
          toast.success(
            t('ts.bulkSaved', {
              h: fmtHours(hoursValue),
              names: selected.map(nameOf).join(', '),
            }),
          );
          onClose();
        },
      },
    );
  };

  const n = selected.length;

  return (
    <Sheet open={open} onClose={onClose} title={t('ts.bulkAdd')} height="tall">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">{t('ts.bulkEmployees')}</span>
            <button
              type="button"
              className="text-xs font-semibold text-accent"
              onClick={() => setSelected(people.map((p) => p.id))}
            >
              {t('ts.bulkSelectAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    'press flex h-10 items-center gap-2 rounded-full border pr-3.5 pl-1 text-sm',
                    on
                      ? 'border-accent bg-accent-soft font-semibold text-accent'
                      : 'border-line bg-white font-medium text-text',
                  )}
                >
                  <Avatar
                    name={p.full_name}
                    path={p.avatar_path}
                    size="sm"
                    // inicjały na zaznaczonej pigułce: pełna czerwień, żeby nie zlewały się z tłem
                    style={on ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : undefined}
                  />
                  {firstName(p.full_name)}
                </button>
              );
            })}
          </div>
        </div>
        <Select
          label={t('common.project')}
          value={projectId}
          placeholder={t('ts.selectProject')}
          options={projectOptions}
          onChange={(e) => {
            setProjectId(e.target.value);
            setActivityId('');
          }}
        />
        {projectActivities.length > 0 && (
          <Select
            label={t('ts.activityField')}
            value={activityId}
            options={[
              { value: '', label: t('ts.choose') },
              ...projectActivities.map((a) => ({ value: a.id, label: a.name })),
            ]}
            onChange={(e) => setActivityId(e.target.value)}
          />
        )}
        <DayPickerField value={date} onChange={setDate} />
        <NumberStepper
          label={t('ts.bulkHoursEach')}
          value={hoursValue}
          onChange={setHoursValue}
          step={0.5}
          min={0.5}
          max={24}
          suffix="h"
        />
        <Input
          label={t('ts.descOptional')}
          value={description}
          placeholder={t('ts.descPlaceholder')}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <Button
            size="lg"
            fullWidth
            disabled={n === 0}
            loading={checking || create.isPending}
            onClick={() => void save()}
          >
            {n === 0 ? t('ts.bulkPick') : tp('ts.bulkSave', n).replace('{n}', String(n))}
          </Button>
          {n > 0 && (
            <p className="tabular-nums text-center text-xs text-text-secondary">
              {t('ts.bulkTotal', { h: fmtHours(hoursValue * n) })}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
