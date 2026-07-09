import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
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

const today = () => format(new Date(), 'yyyy-MM-dd');

export function AbsenceFormSheet({ open, onClose }: AbsenceFormSheetProps) {
  const { user, can } = useSession();
  const canManage = can('absences_manage');
  const employees = useEmployees();
  const create = useCreateAbsence();

  const [employeeId, setEmployeeId] = useState('');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [type, setType] = useState<AbsenceType>('sick');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setEmployeeId(user?.id ?? '');
      setDateFrom(today());
      setDateTo(today());
      setType('sick');
      setNote('');
    }
  }, [open, user?.id]);

  const submit = async () => {
    if (!employeeId) return;
    if (dateTo < dateFrom) {
      toast.error('Data „do" nie może być wcześniejsza niż „od"');
      return;
    }
    if (await hasHoursInRange(employeeId, dateFrom, dateTo)) {
      toast.info('Uwaga: w tym okresie są już wpisane godziny pracy');
    }
    create.mutate(
      {
        employee_id: employeeId,
        date_from: dateFrom,
        date_to: dateTo,
        type,
        note: note.trim() || null,
        created_by: user?.id ?? null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Zgłoś nieobecność">
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
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Od"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (dateTo < e.target.value) setDateTo(e.target.value);
            }}
          />
          <DateField label="Do" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Input
          label="Notatka (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="lg" fullWidth loading={create.isPending} onClick={() => void submit()}>
          Zapisz nieobecność
        </Button>
      </div>
    </Sheet>
  );
}
