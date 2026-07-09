import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import type { PermissionMap } from '@/lib/permissions';
import {
  addCompensation,
  createEmployee,
  fetchActivity,
  fetchCompensation,
  fetchEmployee,
  fetchEmployees,
  resetPassword,
  setActive,
  updateEmployee,
  updatePermissions,
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
      toast.success('Konto pracownika utworzone');
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
      toast.success('Hasło zresetowane');
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
      toast.success(active ? 'Konto aktywowane' : 'Konto dezaktywowane');
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
      toast.success('Dane zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać danych'),
  });
}

export function useUpdatePermissions(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions: PermissionMap) => updatePermissions(id, permissions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.detail(id) });
      toast.success('Uprawnienia zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać uprawnień'),
  });
}

export function useAddCompensation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wage, validFrom }: { wage: number; validFrom: string }) =>
      addCompensation(id, wage, validFrom),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.compensation(id) });
      toast.success('Nowa stawka zapisana');
    },
    onError: () => toast.error('Nie udało się zapisać stawki'),
  });
}
