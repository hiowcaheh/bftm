import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
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
  presetProjectId?: string;
}

export function HoursFormSheet({ open, onClose, entry, presetProjectId }: HoursFormSheetProps) {
  const { user, can } = useSession();
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
      setEmployeeId(entry?.employee_id ?? user?.id ?? '');
      setProjectId(entry?.project_id ?? presetProjectId ?? '');
      setActivityId(entry?.activity_id ?? '');
      setDate(entry?.date ?? today());
      setHoursValue(entry?.hours ?? 8);
      setDescription(entry?.description ?? '');
    }
  }, [open, entry, presetProjectId, user?.id]);

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
      toast.error('Wybierz projekt');
      return;
    }
    if (projectActivities.length > 0 && !activityId) {
      toast.error('Wybierz aktywność — co było robione');
      return;
    }
    if (!employeeId) return;

    // Ostrzeżenie (nieblokujące) o kolizji z nieobecnością
    if (await hasAbsenceOnDate(employeeId, date)) {
      toast.info('Uwaga: w tym dniu zgłoszona jest nieobecność');
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
    <Sheet open={open} onClose={onClose} title={entry ? 'Edytuj wpis' : 'Dodaj godziny'}>
      <div className="flex flex-col gap-4">
        {canPickEmployee && (
          <Select
            label="Pracownik"
            value={employeeId}
            options={(employees.data ?? [])
              .filter((e) => e.active)
              .map((e) => ({ value: e.id, label: e.full_name }))}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        )}
        <Select
          label="Projekt"
          value={projectId}
          placeholder="Wybierz projekt"
          options={[{ value: '', label: '— wybierz —' }, ...projectOptions]}
          onChange={(e) => {
            setProjectId(e.target.value);
            setActivityId(''); // inna lista aktywności dla innego projektu
          }}
        />
        {projectActivities.length > 0 && (
          <Select
            label="Aktywność (co było robione)"
            value={activityId}
            options={[
              { value: '', label: '— wybierz —' },
              ...projectActivities.map((a) => ({ value: a.id, label: a.name })),
            ]}
            onChange={(e) => setActivityId(e.target.value)}
          />
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <DateField label="Data" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button
            variant={date === today() ? 'primary' : 'secondary'}
            size="sm"
            className="mb-0.5"
            onClick={() => setDate(today())}
          >
            Dziś
          </Button>
          <Button
            variant={date === yesterday() ? 'primary' : 'secondary'}
            size="sm"
            className="mb-0.5"
            onClick={() => setDate(yesterday())}
          >
            Wczoraj
          </Button>
        </div>
        <NumberStepper
          label="Godziny"
          value={hoursValue}
          onChange={setHoursValue}
          step={0.5}
          min={0.5}
          max={24}
          suffix="h"
        />
        <Input
          label="Opis (opcjonalnie)"
          value={description}
          placeholder="np. montaż fasady, elewacja południowa"
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button size="lg" fullWidth loading={pending} onClick={() => void save(false)}>
          {entry ? 'Zapisz zmiany' : 'Zapisz'}
        </Button>
        {!entry && (
          <Button variant="secondary" fullWidth loading={pending} onClick={() => void save(true)}>
            Zapisz i dodaj kolejny
          </Button>
        )}
      </div>
    </Sheet>
  );
}
