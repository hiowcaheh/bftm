import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Download, FileText, Plus, Share2, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { Select } from '@/components/ui/Select';
import { SkeletonList } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useDeletePayslip, usePayslips, usePayslipUrl } from '../hooks';
import type { Payslip } from '../api';
import { PayslipUploadSheet } from '../components/PayslipUploadSheet';

const monthLabel = (year: number, month: number) =>
  format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });

/** Zapisanie/udostępnienie pliku (iOS: menu „Zapisz w Plikach / Zdjęcia"). */
async function sharePayslip(url: string, filename: string, type: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], filename, { type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    /* ignoruj — spadamy do otwarcia w nowej karcie */
  }
  window.open(url, '_blank');
}

const MONTHS = [
  { value: '', label: 'Cały rok' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2026, i, 1), 'LLLL', { locale: pl }),
  })),
];

export default function PayslipsPage() {
  const { user, can } = useSession();
  const canManage = user?.role === 'admin' || can('payslips_manage');
  const employees = useEmployees();
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const payslips = usePayslips(canManage ? employeeFilter || undefined : undefined);
  const deletePayslip = useDeletePayslip();

  const yearOptions = [
    { value: '', label: 'Wszystkie lata' },
    ...[0, 1, 2].map((d) => {
      const y = new Date().getFullYear() - d;
      return { value: String(y), label: String(y) };
    }),
  ];

  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<Payslip | null>(null);
  const [toDelete, setToDelete] = useState<Payslip | null>(null);
  const previewUrl = usePayslipUrl(preview?.file_path ?? null);

  const list = (payslips.data ?? []).filter(
    (p) =>
      (!monthFilter || p.month === Number(monthFilter)) &&
      (!yearFilter || p.year === Number(yearFilter)),
  );

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-col gap-2">
          <Select
            aria-label="Filtr pracownika"
            value={employeeFilter}
            options={[
              { value: '', label: 'Wszyscy pracownicy' },
              ...(employees.data ?? [])
                .filter((e) => e.role !== 'admin')
                .map((e) => ({ value: e.id, label: e.full_name })),
            ]}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              aria-label="Filtr miesiąca"
              value={monthFilter}
              options={MONTHS}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
            <Select
              aria-label="Filtr roku"
              value={yearFilter}
              options={yearOptions}
              onChange={(e) => setYearFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      {payslips.isLoading && <SkeletonList rows={4} />}

      {!payslips.isLoading && list.length === 0 && (
        <EmptyState
          icon={FileText}
          message={
            canManage
              ? 'Brak specyfikacji — wyślij pierwszą przyciskiem +.'
              : 'Nie masz jeszcze żadnych specyfikacji wypłaty.'
          }
        />
      )}

      {list.length > 0 && (
        <Card className="flex flex-col divide-y divide-line">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              className="press flex items-center gap-3 p-3 text-left"
              onClick={() => setPreview(p)}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                <FileText className="size-5 text-accent" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium capitalize">
                  {monthLabel(p.year, p.month)}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {[
                    canManage ? p.employee?.full_name : null,
                    p.file_type === 'application/pdf' ? 'PDF' : 'Zdjęcie',
                    `wysłano ${fmtDate(p.created_at)}`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
            </button>
          ))}
        </Card>
      )}

      {canManage && (
        <FAB
          label="Wyślij specyfikację"
          icon={<Plus className="size-7" />}
          onClick={() => setUploadOpen(true)}
        />
      )}

      {canManage && (
        <PayslipUploadSheet
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          defaultEmployeeId={employeeFilter || undefined}
          existing={list}
        />
      )}

      {/* Podgląd specyfikacji — pełny ekran */}
      {preview &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col bg-black">
            <div
              className="flex items-center justify-between gap-3 px-4 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
            >
              <button
                type="button"
                aria-label="Zamknij"
                className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={() => setPreview(null)}
              >
                <X className="size-5" />
              </button>
              <span className="truncate text-sm font-medium text-white capitalize">
                {monthLabel(preview.year, preview.month)}
                {canManage && preview.employee ? ` • ${preview.employee.full_name}` : ''}
              </span>
              {canManage ? (
                <button
                  type="button"
                  aria-label="Usuń specyfikację"
                  className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
                  onClick={() => setToDelete(preview)}
                >
                  <Trash2 className="size-5" />
                </button>
              ) : (
                <span className="size-10" />
              )}
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center p-2">
              {!previewUrl.data ? (
                <p className="text-sm text-white/70">Wczytywanie…</p>
              ) : preview.file_type === 'application/pdf' ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <FileText className="size-16 text-white/60" strokeWidth={1.4} />
                  <p className="text-sm text-white/80">Specyfikacja w formacie PDF</p>
                </div>
              ) : (
                <img
                  src={previewUrl.data}
                  alt="Specyfikacja wypłaty"
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            {/* Zapisz / udostępnij — iOS: menu „Zapisz w Plikach / Zdjęcia" */}
            <div
              className="px-4 pt-2"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
            >
              <button
                type="button"
                disabled={!previewUrl.data}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-input) bg-white text-sm font-semibold text-text disabled:opacity-50"
                onClick={() => {
                  if (!previewUrl.data) return;
                  const ext = preview.file_type === 'application/pdf' ? 'pdf' : 'jpg';
                  const filename = `specyfikacja-${preview.year}-${String(preview.month).padStart(2, '0')}.${ext}`;
                  void sharePayslip(previewUrl.data, filename, preview.file_type).catch(
                    () => toast.error('Nie udało się udostępnić pliku'),
                  );
                }}
              >
                {preview.file_type === 'application/pdf' ? (
                  <>
                    <Download className="size-5" /> Zapisz / otwórz PDF
                  </>
                ) : (
                  <>
                    <Share2 className="size-5" /> Zapisz / udostępnij
                  </>
                )}
              </button>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Usunąć specyfikację?"
        description="Plik zostanie trwale usunięty; pracownik straci do niego dostęp."
        confirmLabel="Usuń"
        destructive
        loading={deletePayslip.isPending}
        onConfirm={() => {
          if (toDelete) {
            deletePayslip.mutate(toDelete, {
              onSuccess: () => {
                setToDelete(null);
                setPreview(null);
              },
            });
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
