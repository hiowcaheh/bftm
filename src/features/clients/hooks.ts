import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import {
  createClient,
  deleteClient,
  fetchClient,
  fetchClients,
  updateClient,
} from './api';
import type { ClientInsert } from './types';

export function useClients() {
  return useQuery({ queryKey: qk.clients.list(), queryFn: fetchClients });
}

export function useClient(id: string) {
  return useQuery({ queryKey: qk.clients.detail(id), queryFn: () => fetchClient(id) });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClientInsert) => createClient(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clients.all });
      toast.success('Klient dodany');
    },
    onError: () => toast.error('Nie udało się dodać klienta'),
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ClientInsert>) => updateClient(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clients.all });
      // projekty pokazują nazwę klienta — odśwież też ich cache
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      toast.success('Zapisano zmiany');
    },
    onError: () => toast.error('Nie udało się zapisać zmian'),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clients.all });
      void queryClient.invalidateQueries({ queryKey: qk.projects.all });
      toast.success('Klient usunięty');
    },
    onError: () =>
      toast.error('Nie udało się usunąć klienta — sprawdź, czy nie ma powiązanych danych'),
  });
}
