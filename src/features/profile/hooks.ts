import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { fetchMyPrivate, saveMyPhone, saveMyPrivate, type MyPrivateData } from './api';

export function useMyPrivate() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.profile.private(),
    queryFn: () => fetchMyPrivate(user!.id),
    enabled: !!user,
  });
}

export function useSaveMyProfile() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, ...values }: MyPrivateData & { phone: string }) => {
      await Promise.all([saveMyPrivate(user!.id, values), saveMyPhone(user!.id, phone)]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile.all });
      void queryClient.invalidateQueries({ queryKey: qk.employees.all });
      toast.success('Profil zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać profilu'),
  });
}
