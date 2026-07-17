import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { toast } from '@/components/ui/Toast';
import { translate } from '@/lib/i18n/context';
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
  sendOfferEmail,
  updateOffer,
  type SendOfferEmailInput,
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
    onError: () => toast.error(translate('off.errSave')),
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
      toast.success(translate('off.deleted'));
    },
    onError: () => toast.error(translate('off.errDelete')),
  });
}

export function useSendOfferEmail() {
  return useMutation({
    mutationFn: (input: SendOfferEmailInput) => sendOfferEmail(input),
    onSuccess: () => toast.success(translate('off.emailSent')),
    onError: (e) => toast.error((e as Error).message || translate('off.errEmail')),
  });
}

export function useUpdateOfferStatus() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Offer['status'] }) =>
      updateOffer(id, { status }),
    onSuccess: invalidate,
    onError: () => toast.error(translate('off.errStatus')),
  });
}

// ── Strona publiczna ─────────────────────────────────────────────────────────

export function usePublicOffer(token: string, track: boolean) {
  return useQuery({
    queryKey: ['publicOffer', token],
    queryFn: () => fetchPublicOffer(token, track),
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
