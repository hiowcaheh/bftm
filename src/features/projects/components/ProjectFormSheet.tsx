import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { useSession } from '@/features/auth/SessionProvider';
import { useClients } from '@/features/clients/hooks';
import { useCreateProject, useUpdateProject } from '../hooks';
import { PROJECT_COLORS, type ProjectWithClient } from '../types';
import type { BillingType } from '@/types/database';

const schema = z.object({
  name: z.string().min(2, 'Podaj nazwę projektu'),
});

interface ProjectFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = nowy projekt */
  project: ProjectWithClient | null;
  /** wstępnie wybrany klient (np. z karty klienta) */
  presetClientId?: string;
}

const empty = {
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
  const canFinance = can('finance_view');
  const clients = useClients();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setForm(
        project
          ? {
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

  const num = (value: string): number | null => {
    const trimmed = value.trim().replace(',', '.');
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors({ name: parsed.error.issues[0]?.message });
      return;
    }
    setErrors({});
    const payload = {
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
    <Sheet open={open} onClose={onClose} title={project ? 'Edytuj projekt' : 'Nowy projekt'} height="tall">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nazwa projektu"
          value={form.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Select
          label="Klient"
          value={form.client_id}
          placeholder="Wybierz klienta"
          options={[
            { value: '', label: 'Bez klienta' },
            ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(e) => set({ client_id: e.target.value })}
        />
        <Input
          label="Adres budowy"
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Typ rozliczenia</p>
          <SegmentedControl
            options={[
              { value: 'hourly', label: 'Godzinowe' },
              { value: 'fixed', label: 'Ryczałt' },
              { value: 'mixed', label: 'Mieszane' },
            ]}
            value={form.billing_type}
            onChange={(billing_type) => set({ billing_type })}
          />
        </div>

        {canFinance && (
          <div className="grid grid-cols-2 gap-3">
            {form.billing_type !== 'fixed' && (
              <Input
                label="Stawka dla klienta (kr/h)"
                inputMode="decimal"
                value={form.hourly_rate}
                onChange={(e) => set({ hourly_rate: e.target.value })}
              />
            )}
            {form.billing_type !== 'hourly' && (
              <Input
                label="Wartość ryczałtu (kr)"
                inputMode="decimal"
                value={form.fixed_value}
                onChange={(e) => set({ fixed_value: e.target.value })}
              />
            )}
          </div>
        )}

        <Input
          label="Budżet godzin (opcjonalnie)"
          inputMode="decimal"
          hint="Pasek postępu: przepracowane vs budżet"
          value={form.estimated_hours}
          onChange={(e) => set({ estimated_hours: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Data rozpoczęcia"
            value={form.start_date}
            onChange={(e) => set({ start_date: e.target.value })}
          />
          <DateField
            label="Data zakończenia"
            value={form.end_date}
            onChange={(e) => set({ end_date: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Kolor projektu</p>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Kolor ${color}`}
                onClick={() => set({ color })}
                className={cn(
                  'press size-9 rounded-full border-2',
                  form.color === color ? 'border-text' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <Textarea
          label="Opis (opcjonalnie)"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={create.isPending || update.isPending}
        >
          {project ? 'Zapisz zmiany' : 'Dodaj projekt'}
        </Button>
      </form>
    </Sheet>
  );
}
