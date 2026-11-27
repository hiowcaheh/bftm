import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Pipette, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input, Textarea, inputClasses } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useClients } from '@/features/clients/hooks';
import { useCreateProject, useProjects, useUpdateProject } from '../hooks';
import { normalizeProjectNumber, sameProjectNumber, suggestProjectNumber } from '../projectNumber';
import { PROJECT_COLORS, type ProjectWithClient } from '../types';
import type { BillingType } from '@/types/database';

interface ProjectFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = nowy projekt */
  project: ProjectWithClient | null;
  /** wstępnie wybrany klient (np. z karty klienta) */
  presetClientId?: string;
}

const empty = {
  number: '',
  name: '',
  client_id: '',
  address: '',
  billing_type: 'hourly' as BillingType,
  hourly_rate: '',
  fixed_value: '',
  estimated_hours: '',
  start_date: '',
  end_date: '',
  description: '',
  color: PROJECT_COLORS[0] as string,
};

export function ProjectFormSheet({
  open,
  onClose,
  project,
  presetClientId,
}: ProjectFormSheetProps) {
  const { can, user } = useSession();
  const t = useT();
  const canFinance = can('finance_view');
  const clients = useClients();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<{ name?: string; number?: string }>({});
  const projects = useProjects();
  // Podpowiedź kolejnego numeru: najwyższy istniejący + 1 (bez edytowanego projektu)
  const suggestion = useMemo(
    () => suggestProjectNumber(projects.data ?? [], project?.id),
    [projects.data, project?.id],
  );

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
              number: project.number ?? '',
              name: project.name,
              client_id: project.client_id ?? '',
              address: project.address ?? '',
              billing_type: project.billing_type,
              hourly_rate: project.hourly_rate?.toString() ?? '',
              fixed_value: project.fixed_value?.toString() ?? '',
              estimated_hours: project.estimated_hours?.toString() ?? '',
              start_date: project.start_date ?? '',
              end_date: project.end_date ?? '',
              description: project.description ?? '',
              color: project.color ?? (PROJECT_COLORS[0] as string),
            }
          : { ...empty, client_id: presetClientId ?? '' },
      );
      setErrors({});
    }
  }, [open, project, presetClientId]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  // Kolor spoza gotowej palety → wybrany własnym pickerem.
  const isCustomColor = !PROJECT_COLORS.includes(form.color);

  const num = (value: string): number | null => {
    const trimmed = value.trim().replace(',', '.');
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const number = normalizeProjectNumber(form.number);
    // ten sam numer w innym projekcie — blokujemy od razu (w bazie i tak jest unikalny indeks)
    const taken = number
      ? (projects.data ?? []).find((p) => p.id !== project?.id && sameProjectNumber(p.number, number))
      : undefined;
    const nextErrors = {
      ...(form.name.trim().length < 2 && { name: t('proj.nameErr') }),
      ...(taken && { number: t('proj.numberTaken', { num: number!, name: taken.name }) }),
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.number) return;
    const payload = {
      number,
      name: form.name.trim(),
      client_id: form.client_id || null,
      address: form.address.trim() || null,
      billing_type: form.billing_type,
      estimated_hours: num(form.estimated_hours),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description.trim() || null,
      color: form.color,
      // pola finansowe zapisują tylko uprawnieni — inni ich nawet nie widzą
      ...(canFinance && {
        hourly_rate: num(form.hourly_rate),
        fixed_value: num(form.fixed_value),
      }),
      ...(project ? {} : { created_by: user?.id ?? null }),
    };
    const mutation = project ? update : create;
    mutation.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={project ? t('proj.editProject') : t('proj.newProject')}
      height="tall"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-number" className="text-xs font-medium text-text-secondary">
            {t('proj.numberLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="project-number"
              value={form.number}
              placeholder={t('proj.numberPh', { num: suggestion?.next ?? 'P2701' })}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={cn(inputClasses(!!errors.number), 'min-w-0 flex-1 font-mono tracking-wide')}
              onChange={(e) => set({ number: e.target.value.toUpperCase() })}
            />
            {suggestion && !form.number.trim() && (
              <Button
                type="button"
                variant="accentSoft"
                className="shrink-0"
                icon={<Plus className="size-4" />}
                onClick={() => set({ number: suggestion.next })}
              >
                {t('proj.numberInsert', { num: suggestion.next })}
              </Button>
            )}
          </div>
          {errors.number ? (
            <p className="text-xs text-error">{errors.number}</p>
          ) : (
            suggestion && (
              <p className="text-xs text-text-secondary">
                {t('proj.numberPrev', { num: suggestion.previous, name: suggestion.previousName })}
              </p>
            )
          )}
        </div>
        <Input
          label={t('proj.nameLabel')}
          value={form.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Select
          label={t('proj.client')}
          value={form.client_id}
          placeholder={t('proj.selectClient')}
          options={[
            { value: '', label: t('proj.noClient') },
            ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(e) => set({ client_id: e.target.value })}
        />
        <Input
          label={t('proj.buildAddress')}
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">{t('proj.billingType')}</p>
          <SegmentedControl
            options={[
              { value: 'hourly', label: t('billing.hourly') },
              { value: 'fixed', label: t('billing.fixed') },
              { value: 'mixed', label: t('billing.mixed') },
            ]}
            value={form.billing_type}
            onChange={(billing_type) => set({ billing_type })}
          />
        </div>

        {canFinance && (
          <div className="grid grid-cols-2 gap-3">
            {form.billing_type !== 'fixed' && (
              <Input
                label={t('proj.clientRate')}
                inputMode="decimal"
                value={form.hourly_rate}
                onChange={(e) => set({ hourly_rate: e.target.value })}
              />
            )}
            {form.billing_type !== 'hourly' && (
              <Input
                label={t('proj.fixedValue')}
                inputMode="decimal"
                value={form.fixed_value}
                onChange={(e) => set({ fixed_value: e.target.value })}
              />
            )}
          </div>
        )}

        <Input
          label={t('proj.hoursBudget')}
          inputMode="decimal"
          hint={t('proj.hoursBudgetHint')}
          value={form.estimated_hours}
          onChange={(e) => set({ estimated_hours: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateField
            label={t('proj.startDate')}
            value={form.start_date}
            onChange={(e) => set({ start_date: e.target.value })}
          />
          <DateField
            label={t('proj.endDate')}
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">{t('proj.colorLabel')}</p>
          <div className="no-scrollbar grid grid-flow-col grid-rows-2 justify-start gap-2 overflow-x-auto pb-1">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t('proj.colorAria', { color })}
                onClick={() => set({ color })}
                className={cn(
                  'press size-9 rounded-full border-2',
                  form.color === color ? 'border-text' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Własny kolor — natywny picker; podświetlony, gdy kolor spoza palety */}
            <label
              aria-label={t('proj.colorCustom')}
              className={cn(
                'press relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2',
                isCustomColor ? 'border-text' : 'border-transparent',
              )}
              style={
                isCustomColor
                  ? { backgroundColor: form.color }
                  : {
                      background:
                        'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
                    }
              }
            >
              <Pipette
                className="size-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                strokeWidth={2.2}
              />
              <input
                type="color"
                value={form.color}
                onChange={(e) => set({ color: e.target.value.toUpperCase() })}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <Textarea
          label={t('ts.descOptional')}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={create.isPending || update.isPending}
        >
          {project ? t('ts.saveChanges') : t('proj.addProject')}
        </Button>
      </form>
    </Sheet>
  );
}
