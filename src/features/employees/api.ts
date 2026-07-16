import { supabase } from '@/lib/supabaseClient';
import type { Json } from '@/types/database';
import type { PermissionMap } from '@/lib/permissions';
import type { Compensation, Employee, LoginActivity, NewEmployee } from './types';

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data;
}

export async function fetchEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Tworzy konto przez RPC admin_create_employee (security definer, tylko admin). */
export async function createEmployee(payload: NewEmployee): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_employee', {
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_phone: payload.phone,
    p_temp_password: payload.temp_password,
    p_hourly_wage: payload.hourly_wage,
    p_permissions: payload.permissions as Json,
    p_personnummer: payload.personnummer.trim() || null,
  });
  if (error) throw new Error(rpcMessage(error.message));
  return data;
}

export async function resetPassword(profileId: string, tempPassword: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_password', {
    p_profile_id: profileId,
    p_temp_password: tempPassword,
  });
  if (error) throw new Error(rpcMessage(error.message));
}

export async function setActive(profileId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_active', {
    p_profile_id: profileId,
    p_active: active,
  });
  if (error) throw new Error(rpcMessage(error.message));
}

/**
 * Trwale usuwa pracownika z całej aplikacji (konto Auth, profil, godziny,
 * nieobecności, stawki, dane prywatne, powiadomienia, wypłaty, avatar).
 */
export async function deleteEmployee(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_employee', {
    p_profile_id: profileId,
  });
  if (error) throw new Error(rpcMessage(error.message));
}

export async function updateEmployee(
  id: string,
  patch: { full_name?: string; phone?: string | null },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updatePermissions(
  id: string,
  permissions: PermissionMap,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ permissions: permissions as Json })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchCompensation(profileId: string): Promise<Compensation[]> {
  const { data, error } = await supabase
    .from('employee_compensation')
    .select('*')
    .eq('profile_id', profileId)
    .order('valid_from', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addCompensation(
  profileId: string,
  hourlyWage: number,
  validFrom: string,
): Promise<void> {
  const { error } = await supabase.from('employee_compensation').insert({
    profile_id: profileId,
    hourly_wage: hourlyWage,
    valid_from: validFrom,
  });
  if (error) throw error;
}

/** Dane osobiste (personnummer + rozmiary) — RLS: admin lub własny wiersz. */
export interface EmployeePrivate {
  personnummer: string;
  shirt_size: string;
  pants_size: string;
  shoe_size: string;
}

export async function fetchEmployeePrivate(profileId: string): Promise<EmployeePrivate> {
  const { data, error } = await supabase
    .from('employee_private')
    .select('personnummer, shirt_size, pants_size, shoe_size')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return {
    personnummer: data?.personnummer ?? '',
    shirt_size: data?.shirt_size ?? '',
    pants_size: data?.pants_size ?? '',
    shoe_size: data?.shoe_size ?? '',
  };
}

export async function saveEmployeePrivate(
  profileId: string,
  patch: Partial<EmployeePrivate>,
): Promise<void> {
  const cleaned = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [k, v?.trim() || null]),
  );
  const { error } = await supabase.from('employee_private').upsert({
    profile_id: profileId,
    ...cleaned,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Ostatnie logowania i operacje na koncie pracownika (odczyt: tylko admin przez RLS). */
export async function fetchActivity(profileId: string): Promise<LoginActivity[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, created_at')
    .or(`actor.eq.${profileId},entity_id.eq.${profileId}`)
    .in('action', ['login', 'create', 'reset_password', 'deactivate', 'reactivate'])
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

/** Komunikaty RAISE EXCEPTION z Postgresa są już po polsku — wyciągamy sam tekst. */
function rpcMessage(message: string): string {
  return message.replace(/^.*?:\s*/, '').trim() || 'Operacja nie powiodła się';
}
