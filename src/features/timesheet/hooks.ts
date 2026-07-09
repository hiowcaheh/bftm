import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import {
  approveEntries,
  createEntry,
  deleteEntry,
  fetchEntries,
  fetchProjectEntries,
  updateEntry,
} from './api';
import type { HoursFilters, WorkHoursInsert } from './types';

/** Mutacje godzin odświeżają też pulpit, projekty i raporty — przez qk. */
function invalidateHours(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
  void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
  void queryClient.invalidateQueries({ queryKey: qk.projects.all });
  void queryClient.invalidateQueries({ queryKey: qk.reports.all });
}

export function useEntries(filters: HoursFilters) {
  return useQuery({
    queryKey: qk.workHours.list(filters as unknown as Record<string, unknown>),
    queryFn: () => fetchEntries(filters),
  });
}

export function useProjectEntries(projectId: string) {
  return useQuery({
    queryKey: qk.workHours.byProject(projectId),
    queryFn: () => fetchProjectEntries(projectId),
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkHoursInsert) => createEntry(payload),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success('Godziny zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać godzin'),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WorkHoursInsert> }) =>
      updateEntry(id, patch),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success('Wpis zaktualizowany');
    },
    onError: () =>
      toast.error('Nie udało się zapisać — rozliczone wpisy zmienia tylko administrator'),
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success('Wpis usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć wpisu'),
  });
}

export function useApproveEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => approveEntries(ids),
    onSuccess: (_d, ids) => {
      invalidateHours(queryClient);
      toast.success(`Zatwierdzono wpisy: ${ids.length}`);
    },
    onError: () => toast.error('Nie udało się zatwierdzić wpisów'),
  });
}
