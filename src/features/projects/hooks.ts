import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
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
  fetchProjectStats,
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

export function useProjectStats() {
  return useQuery({
    queryKey: [...qk.projects.all, 'stats'],
    queryFn: fetchProjectStats,
    staleTime: 60 * 1000,
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
      toast.success(translate('proj.created'));
    },
    onError: () => toast.error(translate('proj.errCreate')),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProjectInsert>) => updateProject(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success(translate('proj.updated'));
    },
    onError: () => toast.error(translate('proj.errUpdate')),
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
      toast.success(translate('proj.activityAdded'));
    },
    onError: () => toast.error(translate('proj.errActivityAdd')),
  });
}

export function useDeleteActivity(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.activities(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.workHours.all });
      toast.success(translate('proj.activityDeleted'));
    },
    onError: () => toast.error(translate('proj.errActivityDelete')),
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
      toast.success(translate('proj.workSaved'));
    },
    onError: () => toast.error(translate('proj.errWorkSave')),
  });
}

export function useDeleteAdditionalWork(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdditionalWork(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.additionalWorks.byProject(projectId) });
      toast.success(translate('proj.workDeleted'));
    },
    onError: () => toast.error(translate('proj.errWorkDelete')),
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
      toast.success(files.length === 1 ? translate('proj.photoAdded') : translate('proj.photosAdded', { n: files.length }));
    },
    onError: (e: Error) => toast.error(e.message || translate('proj.errPhotoUpload')),
  });
}

export function useDeletePhoto(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) => deletePhoto(id, path),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.photos(projectId) });
      toast.success(translate('proj.photoDeleted'));
    },
    onError: () => toast.error(translate('proj.errPhotoDelete')),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.success(translate('proj.deleted'));
    },
    onError: () =>
      toast.error(translate('proj.errDelete')),
  });
}
