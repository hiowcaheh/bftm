import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/Toast';
import { dateLocaleFor, translate, translateFor } from '@/lib/i18n/context';
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

export function useUploadPayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadPayslipInput) => {
      await uploadPayslip(input);
      // Powiadom pracownika — w JEGO języku (profiles.lang)
      const { data: rec } = await supabase
        .from('profiles')
        .select('lang')
        .eq('id', input.employeeId)
        .maybeSingle();
      const lang = rec?.lang ?? 'pl';
      const month = format(new Date(input.year, input.month - 1, 1), 'LLLL yyyy', {
        locale: dateLocaleFor(lang),
      });
      await sendNotifications([
        {
          recipient_id: input.employeeId,
          type: 'payslip',
          title: translateFor(lang, 'pay.notifTitle'),
          body: translateFor(lang, 'notif.payslipBody', { month }),
        },
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.payslips.all });
      toast.success(translate('pay.sent'));
    },
    onError: (e: Error) => toast.error(e.message || translate('pay.errSend')),
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: Payslip) => deletePayslip(p),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.payslips.all });
      toast.success(translate('pay.deleted'));
    },
    onError: () => toast.error(translate('pay.errDelete')),
  });
}
