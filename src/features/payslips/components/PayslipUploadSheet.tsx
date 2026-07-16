import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { FileText, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n/context';
import { useEmployees } from '@/features/employees/hooks';
import { useUploadPayslip } from '../hooks';
import type { Payslip } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultEmployeeId?: string;
  existing: Payslip[];
}

/** Formularz wgrania lönespec: pracownik + miesiąc/rok + plik (PDF/zdjęcie). */
export function PayslipUploadSheet({ open, onClose, defaultEmployeeId, existing }: Props) {
  const { t, dateLocale } = useI18n();
  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2026, i, 1), 'LLLL', { locale: dateLocale }),
  }));
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmployeeId(defaultEmployeeId ?? '');
      setNote('');
      setFile(null);
    }
  }, [open, defaultEmployeeId]);

  // Podgląd wybranego pliku (obraz) — żeby sprawdzić, czy to właściwa osoba
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y + 1, y, y - 1, y - 2].map((v) => ({ value: String(v), label: String(v) }));
  }, [now]);

  const alreadyExists = existing.some(
    (p) => p.employee_id === employeeId && p.year === Number(year) && p.month === Number(month),
  );

  const submit = () => {
    if (!employeeId) {
      toast.error(t('pay.errEmployee'));
      return;
    }
    if (!file) {
      toast.error(t('pay.errFile'));
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
    <Sheet open={open} onClose={onClose} title={t('pay.uploadTitle')}>
      <div className="flex flex-col gap-4">
        <Select
          label={t('ts.employee')}
          value={employeeId}
          placeholder={t('pay.selectEmployee')}
          options={(employees.data ?? [])
            .filter((e) => e.role !== 'admin')
            .map((e) => ({ value: e.id, label: e.full_name }))}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('pay.month')}
            value={month}
            options={MONTHS}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select
            label={t('pay.year')}
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
            {file ? file.name : t('pay.pickFile')}
          </span>
          <span className="text-xs text-text-secondary">{t('pay.pickFileSub')}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {/* Podgląd — sprawdź, czy to właściwy pracownik */}
        {file && (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t('pay.filePreviewAlt')}
                className="max-h-80 w-full object-contain"
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <FileText className="size-8 shrink-0 text-accent" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-text-secondary">{t('pay.pdfAfterUpload')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Input
          label={t('abs.noteOptional')}
          placeholder={t('pay.notePh')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {alreadyExists && (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
            {t('pay.replaceWarn')}
          </p>
        )}

        <Button size="lg" fullWidth loading={upload.isPending} onClick={submit}>
          {t('pay.sendBtn')}
        </Button>
      </div>
    </Sheet>
  );
}
