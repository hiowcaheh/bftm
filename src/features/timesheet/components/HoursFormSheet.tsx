import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useActivities, useProjects } from '@/features/projects/hooks';
import { hasAbsenceOnDate } from '@/features/absences/api';
import { useCreateEntry, useUpdateEntry } from '../hooks';
import type { WorkHoursEntry } from '../types';

const today = () => format(new Date(), 'yyyy-MM-dd');
const yesterday = () => format(subDays(new Date(), 1), 'yyyy-MM-dd');
const RECENT_PROJECT_KEY = 'bftm-recent-projects';

function rememberProject(id: string) {
  const recent: string[] = JSON.parse(localStorage.getItem(RECENT_PROJECT_KEY) ?? '[]');
  localStorage.setItem(
    RECENT_PROJECT_KEY,
    JSON.stringify([id, ...recent.filter((r) => r !== id)].slice(0, 5)),
  );
}

interface HoursFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = nowy wpis */
  entry: WorkHoursEntry | null;
  /** szablon (Duplikuj): prefill pól jak we wzorze, ale data = dziś i tryb NOWEGO wpisu */
  template?: WorkHoursEntry | null;
  presetProjectId?: string;
  /** Nowy wpis z ustawionym pracownikiem (klik w pustą komórkę dziennika). */
  presetEmployeeId?: string;
  /** Nowy wpis z ustawioną datą (klik w pustą komórkę dziennika). */
  presetDate?: string;
}

export function HoursFormSheet({
  open,
  onClose,
  entry,
  template,
  presetProjectId,
  presetEmployeeId,
  presetDate,
}: HoursFormSheetProps) {
  const { user, can } = useSession();
  const t = useT();
  const canPickEmployee = can('hours_edit_all');
  const employees = useEmployees();
  const projects = useProjects();
  const create = useCreateEntry();
  const update = useUpdateEntry();

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [date, setDate] = useState(today());
  const [hoursValue, setHoursValue] = useState(8);
  const [description, setDescription] = useState('');

  const activities = useActivities(projectId, open && !!projectId);

  useEffect(() => {
    if (open) {
      const source = entry ?? template ?? null;
      setEmployeeId(source?.employee_id ?? presetEmployeeId ?? user?.id ?? '');
      setProjectId(source?.project_id ?? presetProjectId ?? '');
      setActivityId(source?.activity_id ?? '');
      // szablon (Duplikuj) zawsze startuje od dzisiejszej daty; klik w komórkę → jej data
      setDate(entry?.date ?? presetDate ?? today());
      setHoursValue(source?.hours ?? 8);
      setDescription(source?.description ?? '');
    }
  }, [open, entry, template, presetProjectId, presetEmployeeId, presetDate, user?.id]);

  // Ostatnio używane projekty na górze listy
  const projectOptions = useMemo(() => {
    const active = (projects.data ?? []).filter(
      (p) => p.status === 'active' || p.id === entry?.project_id,
    );
    const recent: string[] = JSON.parse(localStorage.getItem(RECENT_PROJECT_KEY) ?? '[]');
    const sorted = [...active].sort((a, b) => {
      const ia = recent.indexOf(a.id);
      const ib = recent.indexOf(b.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return sorted.map((p) => ({ value: p.id, label: p.name }));
  }, [projects.data, entry?.project_id]);

  const projectActivities = activities.data ?? [];

  const save = async (addNext: boolean) => {
    if (!projectId) {
      toast.error(t('ts.errProject'));
      return;
    }
    if (projectActivities.length > 0 && !activityId) {
      toast.error(t('ts.errActivity'));
      return;
    }
    if (!employeeId) return;

    // Ostrzeżenie (nieblokujące) o kolizji z nieobecnością
    if (await hasAbsenceOnDate(employeeId, date)) {
      toast.info(t('ts.absenceWarn'));
    }

    const payload = {
      project_id: projectId,
      employee_id: employeeId,
      activity_id: activityId || null,
      date,
      hours: hoursValue,
      description: description.trim() || null,
      created_by: user?.id ?? null,
    };
    rememberProject(projectId);

    if (entry) {
      update.mutate({ id: entry.id, patch: payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          if (addNext) {
            setDescription('');
            setHoursValue(8);
          } else {
            onClose();
          }
        },
      });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onClose={onClose} title={entry ? t('ts.editEntry') : t('ts.addHours')}>
      <div className="flex flex-col gap-4">
        {canPickEmployee && (
          <Select
            label={t('ts.employee')}
            value={employeeId}
            options={(employees.data ?? [])
              .filter((e) => e.active)
              .map((e) => ({ value: e.id, label: e.full_name }))}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        )}
        <Select
          label={t('common.project')}
          value={projectId}
          placeholder={t('ts.selectProject')}
          options={[{ value: '', label: t('ts.choose') }, ...projectOptions]}
          onChange={(e) => {
            setProjectId(e.target.value);
            setActivityId(''); // inna lista aktywności dla innego projektu
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
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <DateField label={t('ts.date')} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button
            variant={date === today() ? 'primary' : 'secondary'}
            size="sm"
            className="mb-0.5"
            onClick={() => setDate(today())}
          >
            {t('ts.todayBtn')}
          </Button>
          <Button
            variant={date === yesterday() ? 'primary' : 'secondary'}
            size="sm"
            className="mb-0.5"
            onClick={() => setDate(yesterday())}
          >
            {t('ts.yesterdayBtn')}
          </Button>
        </div>
        <NumberStepper
          label={t('ts.hoursField')}
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
        <Button size="lg" fullWidth loading={pending} onClick={() => void save(false)}>
          {entry ? t('ts.saveChanges') : t('common.save')}
        </Button>
        {!entry && (
          <Button variant="secondary" fullWidth loading={pending} onClick={() => void save(true)}>
            {t('ts.saveAndNext')}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
