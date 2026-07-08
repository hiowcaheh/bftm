import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Jedyny klient Supabase w aplikacji. Anon key może być w bundlu —
 * dane chroni RLS. Klucz service_role istnieje wyłącznie w sekretach
 * Edge Functions i NIGDY nie trafia do kodu klienta.
 */
/*
 * Wartości domyślne wskazują projekt produkcyjny BFTM — dzięki temu deploy
 * nie wymaga sekretów w GitHub Actions. Anon key jest kluczem publicznym
 * (trafia do bundla w każdej aplikacji Supabase); dane chroni RLS.
 * Zmienne VITE_* nadpisują domyślne (np. inny projekt w dev).
 */
const DEFAULT_URL = 'https://ixositdqghamqeproryp.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4b3NpdGRxZ2hhbXFlcHJvcnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjc5OTgsImV4cCI6MjA5OTEwMzk5OH0.7mtMbOIRoPL0gnp8rOODZr6dCp--0sl_2OKSL3rWEnk';

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabaseConfigured = true;

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
