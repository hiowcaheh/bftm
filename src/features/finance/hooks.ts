import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import type { TablesInsert } from '@/types/database';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createProjectInvoice,
  deleteProjectInvoice,
  fetchFinanceDaily,
  fetchFinanceSummary,
  fetchProjectInvoices,
  updateProjectInvoice,
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

export function useProjectInvoices(projectId: string) {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.finance.invoices(projectId),
    queryFn: () => fetchProjectInvoices(projectId),
    enabled: can('finance_view'),
  });
}

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.finance.all });
  };
}

export function useSaveProjectInvoice() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | null;
      payload: TablesInsert<'project_invoices'>;
    }) => (id ? updateProjectInvoice(id, payload) : createProjectInvoice(payload)),
    onSuccess: invalidate,
    onError: () => toast.error(translate('fin.errInvoiceSave')),
  });
}

export function useMarkInvoicePaid() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt: string | null }) =>
      updateProjectInvoice(id, { paid_at: paidAt }),
    onSuccess: invalidate,
    onError: () => toast.error(translate('fin.errPaymentSave')),
  });
}

export function useDeleteProjectInvoice() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => deleteProjectInvoice(id),
    onSuccess: invalidate,
    onError: () => toast.error(translate('fin.errInvoiceDelete')),
  });
}
