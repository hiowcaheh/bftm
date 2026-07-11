import { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Download, FileText, Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { Select } from '@/components/ui/Select';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import { useEmployees } from '@/features/employees/hooks';
import { useDeletePayslip, usePayslips, usePayslipUrl } from '../hooks';
import type { Payslip } from '../api';
import { PayslipUploadSheet } from '../components/PayslipUploadSheet';

const monthLabel = (year: number, month: number) =>
  format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });

export default function PayslipsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === 'admin';
  const employees = useEmployees();
  const [employeeFilter, setEmployeeFilter] = useState('');
  const payslips = usePayslips(isAdmin ? employeeFilter || undefined : undefined);
  const deletePayslip = useDeletePayslip();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<Payslip | null>(null);
  const [toDelete, setToDelete] = useState<Payslip | null>(null);
  const previewUrl = usePayslipUrl(preview?.file_path ?? null);

  const list = payslips.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
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
      )}

      {payslips.isLoading && <SkeletonList rows={4} />}

      {!payslips.isLoading && list.length === 0 && (
        <EmptyState
          icon={FileText}
          message={
            isAdmin
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
                    isAdmin ? p.employee?.full_name : null,
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

      {isAdmin && (
        <FAB
          label="Wyślij specyfikację"
          icon={<Plus className="size-7" />}
          onClick={() => setUploadOpen(true)}
        />
      )}

      {isAdmin && (
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
                {isAdmin && preview.employee ? ` • ${preview.employee.full_name}` : ''}
              </span>
              {isAdmin ? (
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
                  <a
                    href={previewUrl.data}
                    target="_blank"
                    rel="noreferrer"
                    className="press flex h-12 items-center gap-2 rounded-(--radius-input) bg-white px-5 text-sm font-semibold text-text"
                  >
                    <Download className="size-5" /> Otwórz / pobierz PDF
                  </a>
                </div>
              ) : (
                <img
                  src={previewUrl.data}
                  alt="Specyfikacja wypłaty"
                  className="max-h-full max-w-full object-contain"
                />
              )}
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
