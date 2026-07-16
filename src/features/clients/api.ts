import { supabase } from '@/lib/supabaseClient';
import type { Client, ClientInsert } from './types';

export interface CompanyLookup {
  valid: boolean;
  name?: string | null;
  address?: string | null;
  orgnr?: string | null;
}

/** Pobiera dane firmy po organisationsnummer (VAT/VIES) — RPC na backendzie. */
export async function lookupCompanyByOrgnr(orgnr: string): Promise<CompanyLookup> {
  const { data, error } = await supabase.rpc('lookup_company_by_orgnr', { p_orgnr: orgnr });
  if (error) throw error;
  return (data ?? { valid: false }) as unknown as CompanyLookup;
}

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createClient(payload: ClientInsert): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, patch: Partial<ClientInsert>): Promise<void> {
  const { error } = await supabase.from('clients').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
