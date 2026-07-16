import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
import type { PermissionMap } from '@/lib/permissions';
import {
  addCompensation,
  createEmployee,
  deleteEmployee,
  fetchActivity,
  fetchCompensation,
  fetchEmployee,
  fetchEmployeePrivate,
  fetchEmployees,
  resetPassword,
  saveEmployeePrivate,
  setActive,
  updateEmployee,
  updatePermissions,
  type EmployeePrivate,
} from './api';
import type { NewEmployee } from './types';

export function useEmployees() {
  return useQuery({ queryKey: qk.employees.list(), queryFn: fetchEmployees });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: qk.employees.detail(id),
    queryFn: () => fetchEmployee(id),
  });
}

export function useCompensation(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.employees.compensation(id),
    queryFn: () => fetchCompensation(id),
    enabled,
  });
}

export function useEmployeePrivate(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...qk.employees.detail(id), 'private'],
    queryFn: () => fetchEmployeePrivate(id),
    enabled,
  });
}

export function useSaveEmployeePrivate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<EmployeePrivate>) => saveEmployeePrivate(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.detail(id) });
      toast.success(translate('emp.saved'));
    },
    onError: () => toast.error(translate('emp.errSaveData')),
  });
}

export function useEmployeeActivity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...qk.employees.detail(id), 'activity'],
    queryFn: () => fetchActivity(id),
    enabled,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewEmployee) => createEmployee(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      toast.success(translate('emp.accountCreated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tempPassword }: { id: string; tempPassword: string }) =>
      resetPassword(id, tempPassword),
    onSuccess: (_d, { id }) => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.detail(id) });
      toast.success(translate('emp.pwReset'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setActive(id, active),
    onSuccess: (_d, { active }) => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      toast.success(active ? translate('emp.activated') : translate('emp.deactivated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Trwałe usunięcie pracownika — czyści też cache godzin/raportów, bo znikają jego wpisy. */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success(translate('emp.deleted'));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { full_name?: string; phone?: string | null }) =>
      updateEmployee(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      toast.success(translate('emp.dataSaved'));
    },
    onError: () => toast.error(translate('emp.errSaveData')),
  });
}

export function useUpdatePermissions(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: PermissionMap) => updatePermissions(id, permissions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.detail(id) });
      toast.success(translate('emp.permsSaved'));
    },
    onError: () => toast.error(translate('emp.errPerms')),
  });
}

export function useAddCompensation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wage, validFrom }: { wage: number; validFrom: string }) =>
      addCompensation(id, wage, validFrom),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.compensation(id) });
      toast.success(translate('emp.wageSaved'));
    },
    onError: () => toast.error(translate('emp.errWage')),
  });
}
