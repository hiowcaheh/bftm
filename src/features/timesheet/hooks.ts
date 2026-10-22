import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import {
  DuplicateEntryError,
  approveEntries,
  createEntries,
  createEntry,
  deleteEntry,
  fetchEntries,
  fetchLastOwnEntry,
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
  // podpowiedzi „do zafakturowania" zależą od statusu godzin
  void queryClient.invalidateQueries({ queryKey: qk.finance.all });
  void queryClient.invalidateQueries({ queryKey: qk.results.all });
}

/** Ostatni własny wpis sprzed dziś (szablon „Jak wczoraj"). */
export function useLastOwnEntry(employeeId: string | undefined, today: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.workHours.lastOwn(employeeId ?? '', today),
    queryFn: () => fetchLastOwnEntry(employeeId!, today),
    enabled: enabled && !!employeeId,
  });
}

export function useEntries(filters: HoursFilters) {
  return useQuery({
    queryKey: qk.workHours.list(filters as unknown as Record<string, unknown>),
    queryFn: () => fetchEntries(filters),
  });
}

export function useProjectEntries(projectId: string, enabled = true) {
  return useQuery({
    queryKey: qk.workHours.byProject(projectId),
    queryFn: () => fetchProjectEntries(projectId),
    enabled,
  });
}

/** Masowe dodanie godzin — toast z listą osób robi formularz. */
export function useCreateEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payloads: WorkHoursInsert[]) => createEntries(payloads),
    onSuccess: () => invalidateHours(queryClient),
    onError: (e: Error) =>
      toast.error(e instanceof DuplicateEntryError ? e.message : translate('ts.errSave')),
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkHoursInsert) => createEntry(payload),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success(translate('ts.saved'));
    },
    onError: (e: Error) =>
      toast.error(e instanceof DuplicateEntryError ? e.message : translate('ts.errSave')),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WorkHoursInsert> }) =>
      updateEntry(id, patch),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success(translate('ts.updated'));
    },
    onError: (e: Error) =>
      toast.error(e instanceof DuplicateEntryError ? e.message : translate('ts.errUpdate')),
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      invalidateHours(queryClient);
      toast.success(translate('ts.deleted'));
    },
    onError: () => toast.error(translate('ts.errDelete')),
  });
}

export function useApproveEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, periodLabel }: { ids: string[]; periodLabel: string }) =>
      approveEntries(ids, { label: periodLabel }),
    onSuccess: (_d, { ids }) => {
      invalidateHours(queryClient);
      toast.success(translate('ts.approvedN', { n: ids.length }));
    },
    onError: () => toast.error(translate('ts.errApprove')),
  });
}
