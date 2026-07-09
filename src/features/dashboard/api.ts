import { endOfMonth, format, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

export interface DashboardKpi {
  activeProjects: number;
  hoursThisMonth: number;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * KPI pulpitu. Suma godzin liczona z wpisów widocznych przez RLS —
 * pracownik bez hours_view_all zobaczy automatycznie tylko własne godziny.
 */
export async function fetchKpi(canProjects: boolean): Promise<DashboardKpi> {
  const now = new Date();
  const [projectsRes, hoursRes] = await Promise.all([
    canProjects
      ? supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('work_hours')
      .select('hours')
      .gte('date', iso(startOfMonth(now)))
      .lte('date', iso(endOfMonth(now))),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  return {
    activeProjects: projectsRes.count ?? 0,
    hoursThisMonth: (hoursRes.data ?? []).reduce((s, r) => s + r.hours, 0),
  };
}

export interface TodayEntry {
  employeeName: string;
  projectName: string;
  hours: number;
}

export interface TodayAbsence {
  employeeName: string;
  type: string;
}

export interface TodayInfo {
  entries: TodayEntry[];
  absences: TodayAbsence[];
}

/** „Dziś w pracy": kto wpisał godziny + kto nieobecny (zakres wg RLS). */
export async function fetchToday(): Promise<TodayInfo> {
  const today = iso(new Date());
  const [entriesRes, absencesRes] = await Promise.all([
    supabase
      .from('work_hours')
      .select('hours, employee:profiles!employee_id(full_name), project:projects(name)')
      .eq('date', today),
    supabase
      .from('absences')
      .select('type, employee:profiles!employee_id(full_name)')
      .lte('date_from', today)
      .gte('date_to', today),
  ]);
  if (entriesRes.error) throw entriesRes.error;
  if (absencesRes.error) throw absencesRes.error;

  return {
    entries: (entriesRes.data as unknown as Array<{
      hours: number;
      employee: { full_name: string } | null;
      project: { name: string } | null;
    }>).map((e) => ({
      employeeName: e.employee?.full_name ?? '?',
      projectName: e.project?.name ?? '?',
      hours: e.hours,
    })),
    absences: (absencesRes.data as unknown as Array<{
      type: string;
      employee: { full_name: string } | null;
    }>).map((a) => ({
      employeeName: a.employee?.full_name ?? '?',
      type: a.type,
    })),
  };
}

export interface RecentEntry {
  id: string;
  date: string;
  hours: number;
  employeeName: string;
  projectName: string;
  projectColor: string | null;
}

export async function fetchRecentEntries(): Promise<RecentEntry[]> {
  const { data, error } = await supabase
    .from('work_hours')
    .select(
      'id, date, hours, employee:profiles!employee_id(full_name), project:projects(name, color)',
    )
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data as unknown as Array<{
    id: string;
    date: string;
    hours: number;
    employee: { full_name: string } | null;
    project: { name: string; color: string | null } | null;
  }>).map((e) => ({
    id: e.id,
    date: e.date,
    hours: e.hours,
    employeeName: e.employee?.full_name ?? '?',
    projectName: e.project?.name ?? '?',
    projectColor: e.project?.color ?? null,
  }));
}
