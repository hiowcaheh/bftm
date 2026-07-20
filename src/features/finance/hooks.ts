import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import type { TablesInsert } from '@/types/database';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createProjectInvoice,
  deleteProjectInvoice,
  fetchAllInvoices,
  fetchFinanceDaily,
  fetchFinanceSummary,
  fetchInvoiceSuggestions,
  fetchProjectInvoices,
  fetchUninvoicedHours,
  invoiceProjectHours,
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
    // fakturowanie zmienia status godzin i kafelki pulpitu
    void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
    void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
  };
}

export function useAllInvoices() {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.finance.invoicesAll(),
    queryFn: fetchAllInvoices,
    enabled: can('finance_view'),
  });
}

export function useInvoiceSuggestions() {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.finance.suggestions(),
    queryFn: fetchInvoiceSuggestions,
    enabled: can('finance_view'),
  });
}

export function useUninvoicedHours(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: qk.finance.uninvoiced(projectId ?? '-', from, to),
    queryFn: () => fetchUninvoicedHours(projectId!, from, to),
    enabled: projectId !== null && !!from && !!to,
  });
}

export function useInvoiceHours() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: invoiceProjectHours,
    onSuccess: () => {
      invalidate();
      toast.success(translate('fin.invoiceCreated'));
    },
    onError: (e) =>
      toast.error((e as Error).message?.replace(/^.*?:\s*/, '') || translate('fin.errInvoiceSave')),
  });
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
