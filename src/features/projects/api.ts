import { supabase } from '@/lib/supabaseClient';
import type { ProjectInsert, ProjectWithClient } from './types';

/**
 * Kolumny bez danych finansowych — dla użytkowników bez finance_view
 * wartości kontraktów nie trafiają nawet do odpowiedzi zapytania.
 */
const BASE_COLUMNS =
  'id, client_id, name, status, address, start_date, end_date, billing_type, estimated_hours, description, color, created_by, created_at';
const FINANCE_COLUMNS = `${BASE_COLUMNS}, hourly_rate, fixed_value`;

const withClient = (cols: string) => `${cols}, client:clients(id, name)`;

type ProjectRowRaw = Omit<ProjectWithClient, 'hourly_rate' | 'fixed_value'> &
  Partial<Pick<ProjectWithClient, 'hourly_rate' | 'fixed_value'>>;

function normalize(row: ProjectRowRaw): ProjectWithClient {
  return { hourly_rate: null, fixed_value: null, ...row };
}

export async function fetchProjects(canFinance: boolean): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectRowRaw[]).map(normalize);
}

export async function fetchProject(
  id: string,
  canFinance: boolean,
): Promise<ProjectWithClient | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as ProjectRowRaw) : null;
}

export async function fetchProjectsByClient(
  clientId: string,
  canFinance: boolean,
): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectRowRaw[]).map(normalize);
}

export async function createProject(payload: ProjectInsert): Promise<string> {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInsert>,
): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}
