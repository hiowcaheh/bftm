import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createActivity,
  createAdditionalWork,
  createProject,
  deleteActivity,
  deleteAdditionalWork,
  deletePhoto,
  deleteProject,
  fetchActivities,
  fetchAdditionalWorks,
  fetchPhotos,
  fetchProject,
  fetchProjects,
  fetchProjectsByClient,
  updateAdditionalWork,
  updateProject,
  uploadPhotos,
} from './api';
import type { TablesInsert } from '@/types/database';
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

export function useAdditionalWorks(projectId: string) {
  return useQuery({
    queryKey: qk.additionalWorks.byProject(projectId),
    queryFn: () => fetchAdditionalWorks(projectId),
  });
}

export function useSaveAdditionalWork(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | null;
      payload: TablesInsert<'additional_works'>;
    }) => (id ? updateAdditionalWork(id, payload) : createAdditionalWork(payload)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.additionalWorks.byProject(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success('Praca dodatkowa zapisana');
    },
    onError: () => toast.error('Nie udało się zapisać pracy dodatkowej'),
  });
}

export function useDeleteAdditionalWork(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdditionalWork(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.additionalWorks.byProject(projectId) });
      toast.success('Praca dodatkowa usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć'),
  });
}

export function useProjectPhotos(projectId: string) {
  return useQuery({
    queryKey: qk.projects.photos(projectId),
    queryFn: () => fetchPhotos(projectId),
    staleTime: 45 * 60 * 1000, // podpisane URL-e żyją godzinę
  });
}

export function useUploadPhotos(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, userId }: { files: File[]; userId: string | null }) =>
      uploadPhotos(projectId, files, userId),
    onSuccess: (_d, { files }) => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.photos(projectId) });
      toast.success(files.length === 1 ? 'Zdjęcie dodane' : `Dodano zdjęcia: ${files.length}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się przesłać zdjęć'),
  });
}

export function useDeletePhoto(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) => deletePhoto(id, path),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.photos(projectId) });
      toast.success('Zdjęcie usunięte');
    },
    onError: () => toast.error('Nie udało się usunąć zdjęcia'),
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
