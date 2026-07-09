import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RangeCalendar } from '@/components/ui/RangeCalendar';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate } from '@/lib/format';
import type { AbsenceType } from '@/types/database';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { hasHoursInRange } from '../api';
import { useCreateAbsence } from '../hooks';
import { ABSENCE_TYPE_LABELS } from '../types';

interface AbsenceFormSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AbsenceFormSheet({ open, onClose }: AbsenceFormSheetProps) {
  const { user, can } = useSession();
  const canManage = can('absences_manage');
  const employees = useEmployees();
  const create = useCreateAbsence();

  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [type, setType] = useState<AbsenceType>('sick');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setEmployeeId(user?.id ?? '');
      setFrom(null);
      setTo(null);
      setType('sick');
      setNote('');
    }
  }, [open, user?.id]);

  const rangeLabel = !from
    ? 'Wybierz dzień na kalendarzu'
    : !to
      ? `Od ${fmtDate(from)} — wybierz dzień końcowy (albo tapnij tę samą datę)`
      : from.getTime() === to.getTime()
        ? fmtDate(from)
        : `${fmtDate(from)} – ${fmtDate(to)}`;

  const submit = async () => {
    if (!employeeId) return;
    if (!from) {
      toast.error('Wybierz datę na kalendarzu');
      return;
    }
    const end = to ?? from; // jeden tap = jeden dzień
    const isoFrom = format(from, 'yyyy-MM-dd');
    const isoTo = format(end, 'yyyy-MM-dd');
    if (await hasHoursInRange(employeeId, isoFrom, isoTo)) {
      toast.info('Uwaga: w tym okresie są już wpisane godziny pracy');
    }
    create.mutate(
      {
        employee_id: employeeId,
        date_from: isoFrom,
        date_to: isoTo,
        type,
        note: note.trim() || null,
        created_by: user?.id ?? null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Zgłoś nieobecność" height="tall">
      <div className="flex flex-col gap-4">
        {canManage && (
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
          label="Rodzaj"
          value={type}
          options={(Object.keys(ABSENCE_TYPE_LABELS) as AbsenceType[]).map((t) => ({
            value: t,
            label: ABSENCE_TYPE_LABELS[t],
          }))}
          onChange={(e) => setType(e.target.value as AbsenceType)}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Okres nieobecności</span>
          <RangeCalendar from={from} to={to} onChange={(f, t) => (setFrom(f), setTo(t))} />
          <p className="tabular-nums text-center text-xs text-text-secondary">{rangeLabel}</p>
        </div>
        <Input
          label="Notatka (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          size="lg"
          fullWidth
          disabled={!from}
          loading={create.isPending}
          onClick={() => void submit()}
        >
          Zapisz nieobecność
        </Button>
      </div>
    </Sheet>
  );
}
