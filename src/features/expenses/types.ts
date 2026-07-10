import type { ExpenseCategory, Tables, TablesInsert } from '@/types/database';

export type Expense = Tables<'expenses'>;
export type ExpenseInsert = TablesInsert<'expenses'>;

export interface ExpenseWithProject extends Expense {
  project: { id: string; name: string; color: string | null } | null;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materials: 'Materiały',
  equipment: 'Sprzęt',
  fuel: 'Paliwo',
  subcontractor: 'Podwykonawca',
  other: 'Inne',
};

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  'materials',
  'equipment',
  'fuel',
  'subcontractor',
  'other',
];
