import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createActivity,
  createProject,
  deleteActivity,
  deleteProject,
  fetchActivities,
  fetchProject,
  fetchProjects,
  fetchProjectsByClient,
  updateProject,
} from './api';
import type { ProjectInsert } from './types';

export function useProjects() {
  const { can } = useSession();
  const canFinance = can('finance_view');
  return useQuery({
    // finance w kluczu: zmiana uprawnień nie może serwować cudzego cache
    queryKey: [...qk.projects.list(), canFinance],
    queryFn: () => fetchProjects(canFinance),
  });
}

export function useProject(id: string) {
  const { can } = useSession();
  const canFinance = can('finance_view');
  return useQuery({
    queryKey: [...qk.projects.detail(id), canFinance],
    queryFn: () => fetchProject(id, canFinance),
  });
}

export function useClientProjects(clientId: string) {
  const { can } = useSession();
  const canFinance = can('finance_view');
  return useQuery({
    queryKey: [...qk.projects.list(), 'client', clientId, canFinance],
    queryFn: () => fetchProjectsByClient(clientId, canFinance),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectInsert) => createProject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success('Projekt dodany');
    },
    onError: () => toast.error('Nie udało się dodać projektu'),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProjectInsert>) => updateProject(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success('Zapisano zmiany');
    },
    onError: () => toast.error('Nie udało się zapisać zmian'),
  });
}

export function useActivities(projectId: string, enabled = true) {
  return useQuery({
    queryKey: qk.projects.activities(projectId),
    queryFn: () => fetchActivities(projectId),
    enabled: enabled && !!projectId,
  });
}

export function useCreateActivity(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createActivity(projectId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.activities(projectId) });
      toast.success('Aktywność dodana');
    },
    onError: () => toast.error('Nie udało się dodać aktywności'),
  });
}

export function useDeleteActivity(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.activities(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
      toast.success('Aktywność usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć aktywności'),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success('Projekt usunięty');
    },
    onError: () =>
      toast.error('Nie udało się usunąć projektu — ma powiązane wpisy (godziny, koszty)'),
  });
}
