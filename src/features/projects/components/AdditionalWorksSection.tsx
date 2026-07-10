import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Hammer, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { DateField } from '@/components/ui/DateField';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate, moneyWhole } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useAdditionalWorks,
  useDeleteAdditionalWork,
  useSaveAdditionalWork,
} from '../hooks';
import {
  ADDITIONAL_WORK_STATUS_LABELS,
  ADDITIONAL_WORK_STATUS_TONES,
  type AdditionalWork,
} from '../types';

const STATUS_ORDER: AdditionalWork['status'][] = ['proposed', 'approved', 'rejected'];

/** Prace dodatkowe projektu: lista ze statusami, suma zaakceptowanych, CRUD. */
export function AdditionalWorksSection({ projectId }: { projectId: string }) {
  const { can } = useSession();
  const canEdit = can('projects_edit');
  const canFinance = can('finance_view');
  const works = useAdditionalWorks(projectId);
  const save = useSaveAdditionalWork(projectId);
  const deleteWork = useDeleteAdditionalWork(projectId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdditionalWork | null>(null);
  const [toDelete, setToDelete] = useState<AdditionalWork | null>(null);
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<AdditionalWork['status']>('proposed');

  useEffect(() => {
    if (formOpen) {
      setDescription(editing?.description ?? '');
      setValue(editing ? String(editing.value) : '');
      setWorkDate(editing?.date ?? format(new Date(), 'yyyy-MM-dd'));
      setStatus(editing?.status ?? 'proposed');
    }
  }, [formOpen, editing]);

  const approvedTotal = useMemo(
    () =>
      (works.data ?? [])
        .filter((w) => w.status === 'approved' || w.status === 'invoiced')
        .reduce((s, w) => s + w.value, 0),
    [works.data],
  );

  const submit = () => {
    if (description.trim().length < 3) {
      toast.error('Opisz pracę dodatkową');
      return;
    }
    const parsed = Number(value.trim().replace(',', '.'));
    if (canFinance && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error('Podaj prawidłową wartość');
      return;
    }
    save.mutate(
      {
        id: editing?.id ?? null,
        payload: {
          project_id: projectId,
          description: description.trim(),
          date: workDate || null,
          status,
          ...(canFinance && { value: parsed || 0 }),
        },
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          setEditing(null);
        },
      },
    );
  };

  const list = works.data ?? [];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hammer className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">Prace dodatkowe</h2>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Dodaj
          </Button>
        )}
      </div>

      {canFinance && approvedTotal > 0 && (
        <p className="tabular-nums text-sm">
          Zaakceptowane: <span className="font-semibold">{moneyWhole(approvedTotal)}</span>
        </p>
      )}

      {list.length === 0 && (
        <p className="text-sm text-text-secondary">
          Brak prac dodatkowych — dopisuj tu roboty poza zakresem umowy, żeby nic nie umknęło
          przy rozliczeniu.
        </p>
      )}

      {list.map((w) => (
        <button
          key={w.id}
          type="button"
          disabled={!canEdit}
          className="press flex items-center gap-3 rounded-xl bg-surface p-3 text-left"
          onClick={() => {
            setEditing(w);
            setFormOpen(true);
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{w.description}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {[w.date ? fmtDate(w.date) : null, canFinance ? moneyWhole(w.value) : null]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
          <Badge tone={ADDITIONAL_WORK_STATUS_TONES[w.status]}>
            {ADDITIONAL_WORK_STATUS_LABELS[w.status]}
          </Badge>
        </button>
      ))}

      <Sheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edytuj pracę dodatkową' : 'Nowa praca dodatkowa'}
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Opis pracy"
            placeholder="np. dodatkowe szpachlowanie ściany w garażu"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            {canFinance && (
              <Input
                label="Wartość netto (kr)"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
            <DateField
              label="Data"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          <Select
            label="Status"
            value={status}
            options={[
              ...STATUS_ORDER.map((s) => ({
                value: s,
                label: ADDITIONAL_WORK_STATUS_LABELS[s],
              })),
              ...(editing?.status === 'invoiced'
                ? [{ value: 'invoiced', label: ADDITIONAL_WORK_STATUS_LABELS.invoiced }]
                : []),
            ]}
            onChange={(e) => setStatus(e.target.value as AdditionalWork['status'])}
          />
          <Button size="lg" fullWidth loading={save.isPending} onClick={submit}>
            {editing ? 'Zapisz zmiany' : 'Dodaj pracę'}
          </Button>
          {editing && (
            <Button
              variant="destructive"
              fullWidth
              icon={<Trash2 className="size-5" />}
              onClick={() => setToDelete(editing)}
            >
              Usuń
            </Button>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title="Usunąć pracę dodatkową?"
        description={toDelete?.description ?? ''}
        confirmLabel="Usuń"
        destructive
        loading={deleteWork.isPending}
        onConfirm={() => {
          if (toDelete) {
            deleteWork.mutate(toDelete.id, {
              onSuccess: () => {
                setToDelete(null);
                setFormOpen(false);
                setEditing(null);
              },
            });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
