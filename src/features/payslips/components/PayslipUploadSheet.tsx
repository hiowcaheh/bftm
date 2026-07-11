import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useEmployees } from '@/features/employees/hooks';
import { useUploadPayslip } from '../hooks';
import type { Payslip } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultEmployeeId?: string;
  existing: Payslip[];
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2026, i, 1), 'LLLL', { locale: pl }),
}));

/** Formularz wgrania lönespec: pracownik + miesiąc/rok + plik (PDF/zdjęcie). */
export function PayslipUploadSheet({ open, onClose, defaultEmployeeId, existing }: Props) {
  const employees = useEmployees();
  const upload = useUploadPayslip();
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  // domyślnie poprzedni miesiąc (wypłata 25. za poprzedni miesiąc)
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? '');
  const [year, setYear] = useState(String(prev.getFullYear()));
  const [month, setMonth] = useState(String(prev.getMonth() + 1));
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setEmployeeId(defaultEmployeeId ?? '');
      setNote('');
      setFile(null);
    }
  }, [open, defaultEmployeeId]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y + 1, y, y - 1, y - 2].map((v) => ({ value: String(v), label: String(v) }));
  }, [now]);

  const alreadyExists = existing.some(
    (p) => p.employee_id === employeeId && p.year === Number(year) && p.month === Number(month),
  );

  const submit = () => {
    if (!employeeId) {
      toast.error('Wybierz pracownika');
      return;
    }
    if (!file) {
      toast.error('Dodaj plik specyfikacji (PDF lub zdjęcie)');
      return;
    }
    const existingRow =
      existing.find(
        (p) =>
          p.employee_id === employeeId &&
          p.year === Number(year) &&
          p.month === Number(month),
      ) ?? null;
    upload.mutate(
      {
        employeeId,
        year: Number(year),
        month: Number(month),
        file,
        note,
        existing: existingRow,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Wyślij specyfikację wypłaty">
      <div className="flex flex-col gap-4">
        <Select
          label="Pracownik"
          value={employeeId}
          placeholder="Wybierz pracownika…"
          options={(employees.data ?? [])
            .filter((e) => e.role !== 'admin')
            .map((e) => ({ value: e.id, label: e.full_name }))}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Miesiąc"
            value={month}
            options={MONTHS}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select
            label="Rok"
            value={year}
            options={years}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="press flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="size-7 text-text-secondary" />
          <span className="text-sm font-medium">
            {file ? file.name : 'Wybierz plik (PDF lub zdjęcie)'}
          </span>
          <span className="text-xs text-text-secondary">z galerii, plików lub aparatu</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <Input
          label="Notatka (opcjonalnie)"
          placeholder="np. wypłata 25.06"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {alreadyExists && (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
            Za ten miesiąc jest już specyfikacja — zostanie zastąpiona nową.
          </p>
        )}

        <Button size="lg" fullWidth loading={upload.isPending} onClick={submit}>
          Wyślij pracownikowi
        </Button>
      </div>
    </Sheet>
  );
}
