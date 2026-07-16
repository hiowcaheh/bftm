import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RangeCalendar } from '@/components/ui/RangeCalendar';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useClients } from '@/features/clients/hooks';
import { useProjects } from '@/features/projects/hooks';
import { useCreateInvoiceSpec } from '../hooks';
import type { InvoiceSpec } from '../api';

interface NewInvoiceSpecSheetProps {
  open: boolean;
  onClose: () => void;
  /** Wywoływane po zapisie — rodzic generuje i otwiera PDF. */
  onCreated: (spec: InvoiceSpec) => void;
}

export function NewInvoiceSpecSheet({ open, onClose, onCreated }: NewInvoiceSpecSheetProps) {
  const { user } = useSession();
  const clients = useClients();
  const projects = useProjects();
  const create = useCreateInvoiceSpec();

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  useEffect(() => {
    if (open) {
      setClientId('');
      setProjectId('');
      setTitle('');
      setFrom(null);
      setTo(null);
    }
  }, [open]);

  // Projekty zawężone do wybranego klienta (albo wszystkie, gdy brak wyboru)
  const projectOptions = useMemo(() => {
    const list = (projects.data ?? []).filter(
      (p) => !clientId || p.client?.id === clientId,
    );
    return list.map((p) => ({ value: p.id, label: p.name }));
  }, [projects.data, clientId]);

  // Zmiana klienta czyści projekt, jeśli nie należy już do klienta
  useEffect(() => {
    if (projectId && !projectOptions.some((o) => o.value === projectId)) {
      setProjectId('');
    }
  }, [projectOptions, projectId]);

  const rangeLabel = !from
    ? 'Wybierz pierwszy dzień na kalendarzu'
    : !to
      ? `Od ${fmtDate(from)} — wybierz dzień końcowy`
      : from.getTime() === to.getTime()
        ? fmtDate(from)
        : `${fmtDate(from)} – ${fmtDate(to)}`;

  const submit = () => {
    if (!projectId) {
      toast.error('Wybierz projekt');
      return;
    }
    if (!from) {
      toast.error('Wybierz okres na kalendarzu');
      return;
    }
    const end = to ?? from;
    create.mutate(
      {
        client_id: clientId || null,
        project_id: projectId,
        period_from: format(from, 'yyyy-MM-dd'),
        period_to: format(end, 'yyyy-MM-dd'),
        title: title.trim() || null,
        created_by: user?.id ?? null,
      },
      {
        onSuccess: (spec) => {
          onClose();
          onCreated(spec);
        },
      },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nowa specyfikacja faktury" height="tall">
      <div className="flex flex-col gap-4">
        <Select
          label="Klient (opcjonalnie)"
          value={clientId}
          options={[
            { value: '', label: 'Wszyscy klienci' },
            ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(e) => setClientId(e.target.value)}
        />
        <Select
          label="Projekt"
          value={projectId}
          options={[{ value: '', label: 'Wybierz projekt' }, ...projectOptions]}
          onChange={(e) => setProjectId(e.target.value)}
        />
        <Input
          label="Tytuł (np. Puts reparation)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Widoczny w nagłówku PDF"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Okres</span>
          <RangeCalendar from={from} to={to} onChange={(f, t) => (setFrom(f), setTo(t))} />
          <p className="tabular-nums text-center text-xs text-text-secondary">{rangeLabel}</p>
        </div>
        <Button
          size="lg"
          fullWidth
          disabled={!projectId || !from}
          loading={create.isPending}
          onClick={submit}
        >
          Generuj PDF
        </Button>
      </div>
    </Sheet>
  );
}
