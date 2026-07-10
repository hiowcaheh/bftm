import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import type { Json, TablesInsert } from '@/types/database';
import { useSession } from '@/features/auth/SessionProvider';
import {
  createOffer,
  deleteOffer,
  fetchOffer,
  fetchOffers,
  fetchPublicOffer,
  publishOffer,
  replaceOfferItems,
  respondToOffer,
  updateOffer,
} from './api';
import type { Offer } from './types';

export function useOffers() {
  const { can } = useSession();
  return useQuery({
    queryKey: qk.offers.list(),
    queryFn: fetchOffers,
    enabled: can('offers_view'),
  });
}

export function useOffer(id: string | null) {
  return useQuery({
    queryKey: qk.offers.detail(id ?? 'new'),
    queryFn: () => fetchOffer(id!),
    enabled: !!id,
  });
}

function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.offers.all });
  };
}

export function useSaveOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: async ({
      id,
      offer,
      items,
    }: {
      id: string | null;
      offer: Partial<Offer>;
      items: Array<Omit<TablesInsert<'offer_items'>, 'offer_id' | 'position'>>;
    }) => {
      const offerId = id ?? (await createOffer(offer));
      if (id) await updateOffer(id, offer);
      await replaceOfferItems(offerId, items);
      return offerId;
    },
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się zapisać oferty'),
  });
}

export function usePublishOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, snapshot }: { id: string; snapshot: Json | null }) =>
      publishOffer(id, snapshot),
    onSuccess: invalidate,
    onError: (e) =>
      toast.error(`Nie udało się opublikować oferty (${(e as Error).message})`),
  });
}

export function useDeleteOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (id: string) => deleteOffer(id),
    onSuccess: () => {
      invalidate();
      toast.success('Oferta usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć oferty'),
  });
}

export function useUpdateOfferStatus() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Offer['status'] }) =>
      updateOffer(id, { status }),
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się zmienić statusu'),
  });
}

// ── Strona publiczna ─────────────────────────────────────────────────────────

export function usePublicOffer(token: string) {
  return useQuery({
    queryKey: ['publicOffer', token],
    queryFn: () => fetchPublicOffer(token),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRespondToOffer(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accept, comment }: { accept: boolean; comment: string }) =>
      respondToOffer(token, accept, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['publicOffer', token] });
    },
  });
}
