import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useSession } from '@/features/auth/SessionProvider';
import { fetchNotifications, markAllRead } from './api';

export function useNotifications() {
  const { session } = useSession();
  return useQuery({
    queryKey: qk.notifications.list(),
    queryFn: fetchNotifications,
    enabled: !!session,
    // dzwoneczek odświeża się sam co minutę i przy powrocie do aplikacji
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}
