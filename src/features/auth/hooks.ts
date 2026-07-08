import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import {
  changePassword,
  fetchPublicBranding,
  signIn,
  signOut,
} from './api';

/** Branding na ekranie logowania — cache'owany, więc pojawia się natychmiast. */
export function usePublicBranding() {
  return useQuery({
    queryKey: qk.settings.public(),
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: ({ login, password }: { login: string; password: string }) =>
      signIn(login, password),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.profile.all });
      toast.success('Hasło zostało zmienione');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
