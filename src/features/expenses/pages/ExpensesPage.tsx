import { useMemo, useState } from 'react';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Pencil, Receipt, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { Chips } from '@/components/ui/Chips';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date as fmtDate, money, monthYear } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjects } from '@/features/projects/hooks';
import type { ExpenseCategory } from '@/types/database';
import { useDeleteExpense, useExpenses, useReceiptUrl } from '../hooks';
import { EXPENSE_CATEGORY_ORDER, type ExpenseWithProject } from '../types';
import { ExpenseFormSheet } from '../components/ExpenseFormSheet';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export default function ExpensesPage() {
  const { user, can } = useSession();
  const { t } = useI18n();
  const projects = useProjects();
  const deleteExpense = useDeleteExpense();

  const [anchor, setAnchor] = useState(new Date());
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseWithProject | null>(null);
  const [selected, setSelected] = useState<ExpenseWithProject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const from = iso(startOfMonth(anchor));
  const to = iso(endOfMonth(anchor));
  const expenses = useExpenses({
    from,
    to,
    projectId: projectFilter || undefined,
    category: category ?? undefined,
  });
  const receipt = useReceiptUrl(selected?.receipt_path ?? null);

  const total = useMemo(
    () => (expenses.data ?? []).reduce((s, e) => s + e.amount_gross, 0),
    [expenses.data],
  );

  const canModify = (e: ExpenseWithProject) =>
    user?.role === 'admin' || e.created_by === user?.id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t('exp.prevMonth')}
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => setAnchor((a) => subMonths(a, 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{monthYear(anchor)}</p>
          <p className="tabular-nums text-xs text-text-secondary">{money(total)}</p>
        </div>
        <button
          type="button"
          aria-label={t('exp.nextMonth')}
          className="press flex size-10 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
          onClick={() => setAnchor((a) => addMonths(a, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <Chips
        options={EXPENSE_CATEGORY_ORDER.map((c) => ({
          value: c,
          label: t(`ecat.${c}`),
        }))}
        value={category}
        onChange={setCategory}
      />
      <Select
        aria-label={t('ts.projectFilter')}
        value={projectFilter}
        options={[
          { value: '', label: t('exp.allProjectsGeneral') },
          ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
        ]}
        onChange={(e) => setProjectFilter(e.target.value)}
      />

      {expenses.isLoading && <SkeletonList rows={4} />}

      {!expenses.isLoading && (expenses.data?.length ?? 0) === 0 && (
        <EmptyState
          icon={Receipt}
          message={category || projectFilter ? t('exp.noneMatch') : t('exp.emptyMonth')}
        />
      )}

      {(expenses.data?.length ?? 0) > 0 && (
        <ListGroup>
          {expenses.data!.map((e) => (
            <ListRow
              key={e.id}
              leading={
                <div
                  className="h-10 w-1.5 rounded-full"
                  style={{ backgroundColor: e.project?.color ?? '#9E9E9E' }}
                />
              }
              title={
                <span className="flex items-center gap-2">
                  {e.description}
                  {e.receipt_path && <Receipt className="size-3.5 text-text-secondary" />}
                </span>
              }
              subtitle={[
                t(`ecat.${e.category}`),
                e.project?.name ?? t('exp.general'),
                fmtDate(e.date),
              ].join(' • ')}
              trailing={<span className="font-semibold text-text">{money(e.amount_gross)}</span>}
              onClick={() => setSelected(e)}
            />
          ))}
        </ListGroup>
      )}

      {can('expenses_add') && (
        <FAB
          label={t('exp.addExpense')}
          onClick={() => {
            setEditExpense(null);
            setFormOpen(true);
          }}
        />
      )}

      <ExpenseFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditExpense(null);
        }}
        expense={editExpense}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.description ?? ''}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{t(`ecat.${selected.category}`)}</Badge>
              <Badge tone="neutral">{selected.project?.name ?? t('exp.general')}</Badge>
            </div>
            <div className="tabular-nums rounded-xl bg-surface p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('exp.net')}</span>
                <span>{money(selected.amount_net)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">VAT</span>
                <span>{money(selected.vat_amount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t('exp.grossLabel')}</span>
                <span>{money(selected.amount_gross)}</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary">
              {[selected.supplier, fmtDate(selected.date)].filter(Boolean).join(' • ')}
            </p>
            {selected.receipt_path &&
              (receipt.data ? (
                <img
                  src={receipt.data}
                  alt={t('exp.receiptAlt')}
                  className="max-h-96 w-full rounded-xl object-contain"
                />
              ) : (
                <p className="text-xs text-text-secondary">{t('exp.receiptLoading')}</p>
              ))}
            {canModify(selected) && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="press flex h-12 items-center justify-center gap-2 rounded-(--radius-input) bg-surface text-sm font-medium"
                  onClick={() => {
                    setEditExpense(selected);
                    setSelected(null);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-5 text-text-secondary" /> {t('common.edit')}
                </button>
                <button
                  type="button"
                  className="press flex h-12 items-center justify-center gap-2 rounded-(--radius-input) bg-error-soft text-sm font-medium text-error"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-5" /> {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={t('exp.deleteTitle')}
        description={t('ts.cantUndo')}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteExpense.isPending}
        onConfirm={() => {
          if (selected) {
            deleteExpense.mutate(selected.id, {
              onSuccess: () => {
                setConfirmDelete(false);
                setSelected(null);
              },
            });
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
