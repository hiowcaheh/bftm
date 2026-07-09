import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { createAbsence, deleteAbsence, fetchAbsences } from './api';
import type { AbsenceInsert } from './types';

export function useAbsences(from: string, to: string) {
  return useQuery({
    queryKey: qk.absences.list(from, to),
    queryFn: () => fetchAbsences(from, to),
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AbsenceInsert) => createAbsence(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.absences.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
      toast.success('Nieobecność zapisana');
    },
    onError: () => toast.error('Nie udało się zapisać nieobecności'),
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAbsence(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.absences.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
      toast.success('Nieobecność usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć nieobecności'),
  });
}
