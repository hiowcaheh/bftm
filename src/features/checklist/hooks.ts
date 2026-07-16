import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createChecklistItem,
  deleteChecklistItem,
  fetchChecklist,
  setChecklistDone,
} from './api';
import type { NewChecklistItem } from './api';
import type { ChecklistScope } from './types';

export function useChecklist(scope: ChecklistScope, enabled = true) {
  return useQuery({
    queryKey: qk.checklist.list(scope),
    queryFn: () => fetchChecklist(scope),
    enabled,
  });
}

/** Realtime: każda zmiana w tabeli odświeża listy check-listy u wszystkich. */
export function useChecklistRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('checklist-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items' },
        () => {
          void queryClient.invalidateQueries({ queryKey: qk.checklist.all });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: (payload: NewChecklistItem) => createChecklistItem(payload, user?.id ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklist.all }),
    onError: () => toast.error('Nie udało się dodać zadania'),
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      setChecklistDone(id, done, user?.id ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklist.all }),
    onError: () => toast.error('Nie udało się zmienić statusu'),
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChecklistItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.checklist.all }),
    onError: () => toast.error('Nie udało się usunąć zadania'),
  });
}
