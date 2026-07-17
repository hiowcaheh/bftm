import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import {
  createInvoiceSpec,
  deleteInvoiceSpec,
  fetchInvoiceItems,
  fetchInvoiceSpecs,
} from './api';
import type { InvoiceSpecInsert } from './api';

export function useInvoiceSpecs() {
  return useQuery({ queryKey: qk.invoiceSpecs.list(), queryFn: fetchInvoiceSpecs });
}

/** Pozycje na żywo — pobierane tylko gdy podany komplet parametrów. */
export function useInvoiceItems(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: qk.invoiceSpecs.items(projectId ?? '', from, to),
    queryFn: () => fetchInvoiceItems(projectId as string, from, to),
    enabled: Boolean(projectId && from && to),
  });
}

export function useCreateInvoiceSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceSpecInsert) => createInvoiceSpec(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.invoiceSpecs.all });
    },
    onError: () => toast.error(translate('inv.errSave')),
  });
}

export function useDeleteInvoiceSpec() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvoiceSpec(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.invoiceSpecs.all });
      toast.success(translate('inv.deleted'));
    },
    onError: () => toast.error(translate('inv.errDelete')),
  });
}
