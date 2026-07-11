import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { sendNotifications } from '@/features/notifications/api';
import {
  deletePayslip,
  fetchPayslips,
  payslipUrl,
  uploadPayslip,
  type Payslip,
  type UploadPayslipInput,
} from './api';

export function usePayslips(employeeId?: string, enabled = true) {
  return useQuery({
    queryKey: qk.payslips.list(employeeId),
    queryFn: () => fetchPayslips(employeeId),
    enabled,
  });
}

export function usePayslipUrl(path: string | null) {
  return useQuery({
    queryKey: qk.payslips.file(path ?? ''),
    queryFn: () => payslipUrl(path!),
    enabled: !!path,
    staleTime: 45 * 60_000,
  });
}

const monthLabel = (year: number, month: number) =>
  format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });

export function useUploadPayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadPayslipInput) => {
      await uploadPayslip(input);
      // Powiadom pracownika o wysłanej specyfikacji
      await sendNotifications([
        {
          recipient_id: input.employeeId,
          type: 'payslip',
          title: 'Specyfikacja wypłaty',
          body: `Twoja specyfikacja wypłaty za ${monthLabel(input.year, input.month)} jest już dostępna w aplikacji.`,
        },
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.payslips.all });
      toast.success('Specyfikacja wysłana');
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się wysłać specyfikacji'),
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: Payslip) => deletePayslip(p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.payslips.all });
      toast.success('Specyfikacja usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć'),
  });
}
