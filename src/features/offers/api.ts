import { supabase } from '@/lib/supabaseClient';
import type { Json, TablesInsert } from '@/types/database';
import type { Offer, OfferItem, OfferWithClient, PublicOffer } from './types';

const COLUMNS = '*, client:clients(id, name)';

export async function fetchOffers(): Promise<OfferWithClient[]> {
  const { data, error } = await supabase
    .from('offers')
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OfferWithClient[];
}

export async function fetchOffer(
  id: string,
): Promise<{ offer: OfferWithClient; items: OfferItem[] } | null> {
  const [offerRes, itemsRes] = await Promise.all([
    supabase.from('offers').select(COLUMNS).eq('id', id).maybeSingle(),
    supabase
      .from('offer_items')
      .select('*')
      .eq('offer_id', id)
      .order('position')
      .order('created_at'),
  ]);
  if (offerRes.error) throw offerRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (!offerRes.data) return null;
  return {
    offer: offerRes.data as unknown as OfferWithClient,
    items: itemsRes.data,
  };
}

/** Nowa oferta dostaje numer z licznika w ustawieniach (OF-2026-001). */
export async function createOffer(payload: Partial<Offer>): Promise<string> {
  const { data: number, error: numberError } = await supabase.rpc('offer_next_number');
  if (numberError) throw numberError;
  const { data, error } = await supabase
    .from('offers')
    .insert({ ...payload, number } as TablesInsert<'offers'>)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateOffer(id: string, patch: Partial<Offer>): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .update(patch as TablesInsert<'offers'>)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) throw error;
}

/** Pozycje zapisywane w całości — prostsze i odporne na zmiany kolejności. */
export async function replaceOfferItems(
  offerId: string,
  items: Array<Omit<TablesInsert<'offer_items'>, 'offer_id' | 'position'>>,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('offer_items')
    .delete()
    .eq('offer_id', offerId);
  if (deleteError) throw deleteError;
  if (items.length === 0) return;
  const { error } = await supabase.from('offer_items').insert(
    items.map((item, i) => ({ ...item, offer_id: offerId, position: i })),
  );
  if (error) throw error;
}

/** Token dla szkicu — do podglądu przed wysłaniem (status zostaje draft). */
export async function ensureOfferToken(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('offer_ensure_token', { p_offer_id: id });
  if (error) throw error;
  return data;
}

/** Publikacja: zamraża snapshot klienta, nadaje token i status „wysłana". */
export async function publishOffer(
  id: string,
  clientSnapshot: Json | null,
): Promise<string> {
  if (clientSnapshot) {
    await updateOffer(id, { client_snapshot: clientSnapshot });
  }
  const { data, error } = await supabase.rpc('offer_publish', { p_offer_id: id });
  if (error) throw error;
  return data;
}

// ── Strona publiczna (klient, bez logowania) ────────────────────────────────

export async function fetchPublicOffer(
  token: string,
  track: boolean,
): Promise<PublicOffer | null> {
  const { data, error } = await supabase.rpc('offer_public', {
    p_token: token,
    p_track: track,
  });
  if (error) throw error;
  return (data as unknown as PublicOffer | null) ?? null;
}

export async function respondToOffer(
  token: string,
  accept: boolean,
  comment: string,
): Promise<void> {
  const { error } = await supabase.rpc('offer_respond', {
    p_token: token,
    p_accept: accept,
    p_comment: comment.trim() || null,
  });
  if (error) throw error;
}

/** Publiczny adres oferty w tej aplikacji (HashRouter). */
export function offerPublicUrl(token: string, preview = false): string {
  return `${window.location.origin}${window.location.pathname}#/oferta/${token}${preview ? '?podglad=1' : ''}`;
}
