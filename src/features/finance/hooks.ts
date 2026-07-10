import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  fetchFinanceDaily,
  fetchFinanceSummary,
  updateProjectInvoice,
  type InvoiceUpdate,
} from './api';

export function useFinanceSummary(from: string, to: string) {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.finance.summary(from, to),
    queryFn: () => fetchFinanceSummary(from, to),
    enabled: can('finance_view'),
    staleTime: 60_000,
  });
}

export function useFinanceDaily(from: string, to: string) {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.finance.daily(from, to),
    queryFn: () => fetchFinanceDaily(from, to),
    enabled: can('finance_view'),
    staleTime: 60_000,
  });
}

export function useUpdateProjectInvoice(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<InvoiceUpdate>) =>
      updateProjectInvoice(projectId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.finance.all });
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
    },
    onError: () => toast.error('Nie udało się zapisać fakturowania'),
  });
}
