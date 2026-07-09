import { supabase } from '@/lib/supabaseClient';
import type { HoursFilters, WorkHoursEntry, WorkHoursInsert } from './types';

const COLUMNS =
  '*, project:projects(id, name, color), employee:profiles(id, full_name)';

export async function fetchEntries(filters: HoursFilters): Promise<WorkHoursEntry[]> {
  let query = supabase
    .from('work_hours')
    .select(COLUMNS)
    .gte('date', filters.from)
    .lte('date', filters.to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as WorkHoursEntry[];
}

export async function fetchProjectEntries(projectId: string): Promise<WorkHoursEntry[]> {
  const { data, error } = await supabase
    .from('work_hours')
    .select(COLUMNS)
    .eq('project_id', projectId)
    .order('date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as WorkHoursEntry[];
}

export async function createEntry(payload: WorkHoursInsert): Promise<void> {
  const { error } = await supabase.from('work_hours').insert(payload);
  if (error) throw error;
}

export async function updateEntry(
  id: string,
  patch: Partial<WorkHoursInsert>,
): Promise<void> {
  const { error } = await supabase.from('work_hours').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('work_hours').delete().eq('id', id);
  if (error) throw error;
}

/** Zatwierdzenie wszystkich szkiców z zakresu (krok opcjonalny — feature flag). */
export async function approveEntries(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('work_hours')
    .update({ status: 'approved' })
    .in('id', ids);
  if (error) throw error;
}
