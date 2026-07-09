import { supabase } from '@/lib/supabaseClient';
import type { AbsenceInsert, AbsenceWithEmployee } from './types';

const COLUMNS = '*, employee:profiles(id, full_name)';

/** Nieobecności nachodzące na zakres dat (date_from <= to && date_to >= from). */
export async function fetchAbsences(
  from: string,
  to: string,
): Promise<AbsenceWithEmployee[]> {
  const { data, error } = await supabase
    .from('absences')
    .select(COLUMNS)
    .lte('date_from', to)
    .gte('date_to', from)
    .order('date_from', { ascending: false });
  if (error) throw error;
  return data as unknown as AbsenceWithEmployee[];
}

export async function createAbsence(payload: AbsenceInsert): Promise<void> {
  const { error } = await supabase.from('absences').insert(payload);
  if (error) throw error;
}

export async function deleteAbsence(id: string): Promise<void> {
  const { error } = await supabase.from('absences').delete().eq('id', id);
  if (error) throw error;
}

/** Kolizja: czy pracownik ma wpisane godziny w zakresie nieobecności? */
export async function hasHoursInRange(
  employeeId: string,
  from: string,
  to: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('work_hours')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .gte('date', from)
    .lte('date', to);
  if (error) return false;
  return (count ?? 0) > 0;
}

/** Kolizja odwrotna: czy data wpisu godzin wpada w nieobecność pracownika? */
export async function hasAbsenceOnDate(employeeId: string, date: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('absences')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .lte('date_from', date)
    .gte('date_to', date);
  if (error) return false;
  return (count ?? 0) > 0;
}
