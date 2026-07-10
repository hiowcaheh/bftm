import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchProjectExpenses,
  receiptUrl,
  updateExpense,
  type ExpenseFilters,
} from './api';
import type { ExpenseInsert } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: qk.expenses.all });
  void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
  void queryClient.invalidateQueries({ queryKey: qk.reports.all });
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: qk.expenses.list(filters as unknown as Record<string, unknown>),
    queryFn: () => fetchExpenses(filters),
  });
}

export function useProjectExpenses(projectId: string) {
  return useQuery({
    queryKey: qk.expenses.byProject(projectId),
    queryFn: () => fetchProjectExpenses(projectId),
  });
}

export function useReceiptUrl(path: string | null) {
  return useQuery({
    queryKey: ['receiptUrl', path],
    queryFn: () => receiptUrl(path!),
    enabled: !!path,
    staleTime: 45 * 60 * 1000, // podpisany URL żyje godzinę
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExpenseInsert) => createExpense(payload),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Koszt zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać kosztu'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseInsert> }) =>
      updateExpense(id, patch),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Koszt zaktualizowany');
    },
    onError: () => toast.error('Nie udało się zapisać zmian'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Koszt usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć kosztu'),
  });
}
