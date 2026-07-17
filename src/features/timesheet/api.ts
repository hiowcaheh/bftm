import { supabase } from '@/lib/supabaseClient';
import type { HoursFilters, WorkHoursEntry, WorkHoursInsert } from './types';

// profiles!employee_id — work_hours ma DWA odwołania do profiles
// (employee_id i created_by); bez wskazania PostgREST odrzuca zapytanie.
const COLUMNS =
  '*, project:projects(id, name, color), employee:profiles!employee_id(id, full_name, avatar_path), activity:project_activities(id, name)';

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
  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Na ten dzień istnieje już wpis dla tego pracownika w tym projekcie — edytuj go zamiast dodawać nowy',
      );
    }
    throw error;
  }
}

export async function updateEntry(
  id: string,
  patch: Partial<WorkHoursInsert>,
): Promise<void> {
  const { error } = await supabase.from('work_hours').update(patch).eq('id', id);
  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Na ten dzień istnieje już inny wpis dla tego pracownika w tym projekcie',
      );
    }
    throw error;
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('work_hours').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Zatwierdzenie wpisów z okresu + powiadomienia dla pracowników
 * („Twoje godziny za okres … zostały zatwierdzone").
 */
export async function approveEntries(
  ids: string[],
  period: { label: string },
): Promise<void> {
  const { data: affected, error: fetchError } = await supabase
    .from('work_hours')
    .select('employee_id, hours')
    .in('id', ids);
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('work_hours')
    .update({ status: 'approved' })
    .in('id', ids);
  if (error) throw error;

  const { data: userData } = await supabase.auth.getUser();
  const approverId = userData.user?.id;
  const byEmployee = new Map<string, number>();
  for (const row of affected ?? []) {
    byEmployee.set(row.employee_id, (byEmployee.get(row.employee_id) ?? 0) + row.hours);
  }
  // Język każdego odbiorcy → powiadomienie w jego języku
  const recipientIds = [...byEmployee.keys()].filter((id) => id !== approverId);
  const { data: langs } = await supabase
    .from('profiles')
    .select('id, lang')
    .in('id', recipientIds);
  const langOf = new Map((langs ?? []).map((r) => [r.id, r.lang]));

  const { sendNotifications } = await import('@/features/notifications/api');
  const { translateFor } = await import('@/lib/i18n/context');
  await sendNotifications(
    recipientIds.map((employeeId) => {
      const lang = langOf.get(employeeId) ?? 'pl';
      const total = byEmployee.get(employeeId) ?? 0;
      return {
        recipient_id: employeeId,
        type: 'hours_approved',
        title: translateFor(lang, 'notif.hoursApproved'),
        // Każdy człon okresu w osobnej linii (render: whitespace-pre-line)
        body: [
          ...period.label.split(' • '),
          translateFor(lang, 'notif.hoursApprovedBody', { h: total }),
        ].join('\n'),
      };
    }),
  );
}
