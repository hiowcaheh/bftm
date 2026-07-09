import { supabase } from '@/lib/supabaseClient';
import type { Json } from '@/types/database';
import type { CompanyBranding, CompanyDetails } from './types';
import { EMPTY_COMPANY_DETAILS } from './types';

export async function fetchSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function updateSetting(key: string, value: Json): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw error;
}

export async function fetchCompanyDetails(): Promise<CompanyDetails> {
  const value = await fetchSetting<Partial<CompanyDetails>>('company_details');
  return { ...EMPTY_COMPANY_DETAILS, ...value };
}

export async function saveCompany(details: CompanyDetails, slogan: string): Promise<void> {
  await updateSetting('company_details', details as unknown as Json);
  // Branding (nazwa i slogan na ekranie logowania) trzymamy spójnie z danymi firmy
  const branding = await fetchSetting<CompanyBranding>('company_branding');
  await updateSetting('company_branding', {
    name: details.name,
    slogan,
    logo_path: branding?.logo_path ?? null,
  } as unknown as Json);
}

/** Upload logo do publicznego bucketa i zapis ścieżki w brandingu. */
export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('Nie udało się przesłać logo');

  const branding = await fetchSetting<CompanyBranding>('company_branding');
  await updateSetting('company_branding', {
    name: branding?.name ?? '',
    slogan: branding?.slogan ?? '',
    logo_path: path,
  } as unknown as Json);
  return path;
}

export function logoPublicUrl(path: string): string {
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
}
