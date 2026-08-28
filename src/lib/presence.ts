import { supabase } from '@/lib/supabaseClient';

// Obecność „ostatnio aktywny": jedno, wspólne miejsce z throttlingiem, żeby
// każda realna aktywność (wejście do apki, ruch, zmiana strony, podgląd godzin)
// odświeżała profiles.last_seen_at — niezależnie od tego, skąd została wywołana.
// Data NIE zależy od samego (auto)logowania.
let lastPing = 0;

/** Odśwież znacznik „ostatnio aktywny" (throttling 60 s; `force` pomija limit). */
export function pingPresence(force = false): void {
  const now = Date.now();
  if (!force && now - lastPing < 60_000) return;
  lastPing = now;
  // fire-and-forget: brak sesji → RPC nic nie zrobi (auth.uid() null)
  void supabase.rpc('touch_last_seen');
}
