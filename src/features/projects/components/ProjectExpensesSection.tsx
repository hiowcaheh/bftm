import { useMemo, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { moneyWhole } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useProjectExpenses } from '@/features/expenses/hooks';
import { EXPENSE_CATEGORY_ORDER } from '@/features/expenses/types';
import { ExpenseFormSheet } from '@/features/expenses/components/ExpenseFormSheet';

/** Koszty projektu: suma + rozbicie wg kategorii + szybkie dodawanie. */
export function ProjectExpensesSection({ projectId }: { projectId: string }) {
  const { can } = useSession();
  const t = useT();
  const expenses = useProjectExpenses(projectId);
  const [formOpen, setFormOpen] = useState(false);

  const { total, byCategory } = useMemo(() => {
    const byCategory = new Map<string, number>();
    let total = 0;
    for (const e of expenses.data ?? []) {
      total += e.amount_gross;
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount_gross);
    }
    return { total, byCategory };
  }, [expenses.data]);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">{t('proj.expenses')}</h2>
        </div>
        {can('expenses_add') && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => setFormOpen(true)}
          >
            {t('common.add')}
          </Button>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-text-secondary">{t('proj.expensesEmpty')}</p>
      ) : (
        <>
          <p className="tabular-nums text-lg font-semibold">
            {moneyWhole(total)} {t('proj.gross')}
          </p>
          <div className="flex flex-col gap-1 border-t border-line pt-2">
            {EXPENSE_CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
              <div key={c} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-text-secondary">{t(`ecat.${c}`)}</span>
                <span className="tabular-nums font-medium">
                  {moneyWhole(byCategory.get(c)!)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <ExpenseFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        expense={null}
        presetProjectId={projectId}
      />
    </Card>
  );
}
