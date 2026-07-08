import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Jedyny klient Supabase w aplikacji. Anon key może być w bundlu —
 * dane chroni RLS. Klucz service_role istnieje wyłącznie w sekretach
 * Edge Functions i NIGDY nie trafia do kodu klienta.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
