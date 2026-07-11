import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  fetchMyPrivate,
  saveMyPrivate,
  saveMyProfileFields,
  uploadAvatar,
  type MyPrivateData,
} from './api';

export function useMyPrivate() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.profile.private(),
    queryFn: () => fetchMyPrivate(user!.id),
    enabled: !!user,
  });
}

export function useSaveMyProfile() {
  const { user, refresh } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      phone,
      fullName,
      ...values
    }: MyPrivateData & { phone: string; fullName: string }) => {
      await Promise.all([
        saveMyPrivate(user!.id, values),
        saveMyProfileFields(user!.id, { phone, fullName }),
      ]);
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile.all });
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      await refresh();
      toast.success('Profil zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać profilu'),
  });
}

export function useUploadAvatar() {
  const { user, refresh } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(user!.id, file),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      await refresh();
      toast.success('Zdjęcie profilowe zapisane');
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się zapisać zdjęcia'),
  });
}
