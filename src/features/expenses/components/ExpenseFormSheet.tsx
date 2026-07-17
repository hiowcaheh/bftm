import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjects } from '@/features/projects/hooks';
import type { ExpenseCategory } from '@/types/database';
import { uploadReceipt } from '../api';
import { useCreateExpense, useUpdateExpense } from '../hooks';
import { EXPENSE_CATEGORY_ORDER } from '../types';
import type { ExpenseWithProject } from '../types';

const VAT_RATES = [25, 12, 6, 0];

const parse = (v: string): number => {
  const n = Number(v.trim().replace(',', '.').replace(/\s/g, ''));
  return Number.isNaN(n) ? 0 : n;
};
const show = (n: number): string => (n === 0 ? '' : String(Math.round(n * 100) / 100));

interface ExpenseFormSheetProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseWithProject | null;
  presetProjectId?: string;
}

export function ExpenseFormSheet({
  open,
  onClose,
  expense,
  presetProjectId,
}: ExpenseFormSheetProps) {
  const { user } = useSession();
  const t = useT();
  const projects = useProjects();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const fileRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('materials');
  const [projectId, setProjectId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vatRate, setVatRate] = useState(25);
  const [gross, setGross] = useState('');
  const [net, setNet] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(expense?.description ?? '');
      setCategory(expense?.category ?? 'materials');
      setProjectId(expense?.project_id ?? presetProjectId ?? '');
      setSupplier(expense?.supplier ?? '');
      setDate(expense?.date ?? format(new Date(), 'yyyy-MM-dd'));
      setGross(expense ? show(expense.amount_gross) : '');
      setNet(expense ? show(expense.amount_net) : '');
      setVatRate(
        expense && expense.amount_net > 0
          ? Math.round((expense.vat_amount / expense.amount_net) * 100)
          : 25,
      );
      setReceiptFile(null);
      setExistingReceipt(expense?.receipt_path ?? null);
    }
  }, [open, expense, presetProjectId]);

  // Autouzupełnianie: brutto ↔ netto przy wybranej stawce VAT
  const onGross = (value: string) => {
    setGross(value);
    const g = parse(value);
    setNet(show(g / (1 + vatRate / 100)));
  };
  const onNet = (value: string) => {
    setNet(value);
    const n = parse(value);
    setGross(show(n * (1 + vatRate / 100)));
  };
  const onVat = (rate: number) => {
    setVatRate(rate);
    const g = parse(gross);
    if (g > 0) setNet(show(g / (1 + rate / 100)));
  };

  const vatAmount = Math.max(0, parse(gross) - parse(net));

  const save = async () => {
    if (!description.trim()) {
      toast.error(t('exp.errDesc'));
      return;
    }
    if (parse(gross) <= 0) {
      toast.error(t('exp.errGross'));
      return;
    }
    setSaving(true);
    try {
      let receiptPath = existingReceipt;
      if (receiptFile) {
        receiptPath = await uploadReceipt(receiptFile);
      }
      const payload = {
        description: description.trim(),
        category,
        project_id: projectId || null,
        supplier: supplier.trim() || null,
        date,
        amount_gross: parse(gross),
        amount_net: parse(net),
        vat_amount: Math.round(vatAmount * 100) / 100,
        receipt_path: receiptPath,
        ...(expense ? {} : { created_by: user?.id ?? null }),
      };
      if (expense) {
        update.mutate({ id: expense.id, patch: payload }, { onSuccess: onClose });
      } else {
        create.mutate(payload, { onSuccess: onClose });
      }
    } catch {
      toast.error(t('exp.errUpload'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={expense ? t('exp.editExpense') : t('exp.newExpense')} height="tall">
      <div className="flex flex-col gap-4">
        <Input
          label={t('exp.descLabel')}
          placeholder={t('exp.descPh')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('exp.categoryField')}
            value={category}
            options={EXPENSE_CATEGORY_ORDER.map((c) => ({
              value: c,
              label: t(`ecat.${c}`),
            }))}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          />
          <Select
            label={t('common.project')}
            value={projectId}
            options={[
              { value: '', label: t('exp.generalCompany') },
              ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('exp.supplierOptional')}
            placeholder={t('exp.supplierPh')}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <DateField label={t('ts.date')} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t('exp.grossField')}
            inputMode="decimal"
            value={gross}
            onChange={(e) => onGross(e.target.value)}
          />
          <Select
            label="VAT"
            value={String(vatRate)}
            options={VAT_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
            onChange={(e) => onVat(Number(e.target.value))}
          />
          <Input
            label={t('exp.netField')}
            inputMode="decimal"
            value={net}
            onChange={(e) => onNet(e.target.value)}
          />
        </div>
        {vatAmount > 0 && (
          <p className="tabular-nums -mt-2 text-xs text-text-secondary">
            VAT: {Math.round(vatAmount * 100) / 100} kr
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<Camera className="size-5" />}
            onClick={() => fileRef.current?.click()}
          >
            {receiptFile || existingReceipt ? t('exp.changeReceipt') : t('exp.addReceipt')}
          </Button>
          {(receiptFile || existingReceipt) && (
            <span className="flex items-center gap-1 text-xs text-text-secondary">
              {receiptFile ? receiptFile.name : t('exp.savedReceipt')}
              <button
                type="button"
                aria-label={t('exp.removeReceipt')}
                className="press text-error"
                onClick={() => {
                  setReceiptFile(null);
                  setExistingReceipt(null);
                }}
              >
                <X className="size-4" />
              </button>
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setReceiptFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <Button
          size="lg"
          fullWidth
          loading={saving || create.isPending || update.isPending}
          onClick={() => void save()}
        >
          {expense ? t('ts.saveChanges') : t('exp.addExpense')}
        </Button>
      </div>
    </Sheet>
  );
}
