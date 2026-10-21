import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { num } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useActivities, useProjects } from '@/features/projects/hooks';
import { hasAbsenceOnDate } from '@/features/absences/api';
import { useCreateEntry, useUpdateEntry } from '../hooks';
import type { WorkHoursEntry } from '../types';
import { DayPickerField } from './DayPickerField';
import { byRecent, rememberProject } from '../recentProjects';

const today = () => format(new Date(), 'yyyy-MM-dd');

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
  /** „Jak wczoraj" z Pulpitu: opis skąd szablon („wczoraj", „w piątek") — pokazuje baner. */
  templateWhen?: string;
  /** Po zapisie NOWEGO wpisu (i zamknięciu) — Pulpit pokazuje zieloną kartę sukcesu. */
  onSaved?: (info: SavedHoursInfo) => void;
}

export interface SavedHoursInfo {
  hours: number;
  project: string;
  activity: string | null;
  description: string | null;
}

export function HoursFormSheet({
  open,
  onClose,
  entry,
  template,
  presetProjectId,
  presetEmployeeId,
  presetDate,
  templateWhen,
  onSaved,
}: HoursFormSheetProps) {
  const { user, can } = useSession();
  const { t, dateLocale } = useI18n();
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
    return byRecent(active).map((p) => ({ value: p.id, label: p.name }));
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
      // autor wpisu się nie zmienia — „kto edytował" zapisuje baza (trigger 0072)
      const { created_by: _author, ...patch } = payload;
      update.mutate({ id: entry.id, patch }, { onSuccess: onClose });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          if (addNext) {
            setDescription('');
            setHoursValue(8);
          } else {
            onClose();
            onSaved?.({
              hours: payload.hours,
              project: projectOptions.find((o) => o.value === projectId)?.label ?? '—',
              activity: projectActivities.find((a) => a.id === activityId)?.name ?? null,
              description: payload.description,
            });
          }
        },
      });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onClose={onClose} title={entry ? t('ts.editEntry') : t('ts.addHours')}>
      <div className="flex flex-col gap-4">
        {/* „Jak wczoraj": wszystko wypełnione, ale nic nie zapisuje się bez „Zapisz" */}
        {template && templateWhen && !entry && (
          <div className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-2.5 text-[13px] leading-snug">
            <Repeat className="size-5 shrink-0 text-accent" strokeWidth={2} />
            <span>
              {t('ts.prefilledFrom', {
                when: templateWhen,
                date: format(parseISO(template.date), 'EEE dd.MM', { locale: dateLocale }),
              })}
            </span>
          </div>
        )}
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
        <DayPickerField value={date} onChange={setDate} />
        <NumberStepper
          label={
            template && templateWhen && !entry && hoursValue !== template.hours
              ? t('ts.hoursWas', {
                  label: t('ts.hoursField'),
                  when: templateWhen,
                  h: `${num(template.hours)} h`,
                })
              : t('ts.hoursField')
          }
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
