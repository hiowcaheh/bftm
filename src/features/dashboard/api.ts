import { endOfMonth, format, startOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';

export interface DashboardKpi {
  activeProjects: number;
  hoursThisMonth: number;
  expensesThisMonth: number;
  unpaidInvoices: number | null;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * KPI pulpitu. Suma godzin liczona z wpisów widocznych przez RLS —
 * pracownik bez hours_view_all zobaczy automatycznie tylko własne godziny.
 * Nieopłacone faktury tylko przy finance_view (RLS na project_invoices).
 */
export async function fetchKpi(
  canProjects: boolean,
  canFinance: boolean,
): Promise<DashboardKpi> {
  const now = new Date();
  const monthFrom = iso(startOfMonth(now));
  const monthTo = iso(endOfMonth(now));
  const [projectsRes, hoursRes, expensesRes, invoicesRes] = await Promise.all([
    canProjects
      ? supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('work_hours')
      .select('hours')
      .gte('date', monthFrom)
      .lte('date', monthTo),
    supabase
      .from('expenses')
      .select('amount_gross')
      .gte('date', monthFrom)
      .lte('date', monthTo),
    canFinance
      ? supabase.from('project_invoices').select('amount').is('paid_at', null)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (expensesRes.error) throw expensesRes.error;
  return {
    activeProjects: projectsRes.count ?? 0,
    hoursThisMonth: (hoursRes.data ?? []).reduce((s, r) => s + r.hours, 0),
    expensesThisMonth: (expensesRes.data ?? []).reduce((s, r) => s + r.amount_gross, 0),
    unpaidInvoices: canFinance
      ? (invoicesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
      : null,
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

export interface PendingApprovals {
  count: number;
  hours: number;
}

/** Godziny czekające na zatwierdzenie (dla admina / hours_approve). */
export async function fetchPendingApprovals(): Promise<PendingApprovals> {
  const { data, error } = await supabase
    .from('work_hours')
    .select('hours')
    .eq('status', 'draft');
  if (error) throw error;
  return {
    count: data.length,
    hours: data.reduce((s, r) => s + r.hours, 0),
  };
}

export interface WeekDayEntry {
  date: string;
  hours: number;
  projects: string[];
}

/** Ostatnie 7 dni zalogowanego pracownika (RLS zwraca tylko jego wpisy). */
export async function fetchMyWeek(): Promise<WeekDayEntry[]> {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const { data, error } = await supabase
    .from('work_hours')
    .select('date, hours, project:projects(name), activity:project_activities(name)')
    .gte('date', iso(from))
    .order('date', { ascending: false });
  if (error) throw error;

  const byDate = new Map<string, { hours: number; projects: Set<string> }>();
  for (const row of data as unknown as Array<{
    date: string;
    hours: number;
    project: { name: string } | null;
    activity: { name: string } | null;
  }>) {
    const day = byDate.get(row.date) ?? { hours: 0, projects: new Set() };
    day.hours += row.hours;
    const label = [row.project?.name, row.activity?.name].filter(Boolean).join(' — ');
    if (label) day.projects.add(label);
    byDate.set(row.date, day);
  }

  // pełne 7 dni, także puste — lista dzień pod dniem
  const days: WeekDayEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = iso(d);
    const day = byDate.get(key);
    days.push({ date: key, hours: day?.hours ?? 0, projects: [...(day?.projects ?? [])] });
  }
  return days;
}

/** Bieżący tydzień ISO (pon–ndz) — sumy dzienne wg RLS (admin: cała firma). */
export async function fetchThisWeek(): Promise<WeekDayEntry[]> {
  const now = new Date();
  // poniedziałek bieżącego tygodnia ISO
  const monday = new Date(now);
  const dow = (now.getDay() + 6) % 7; // 0 = poniedziałek
  monday.setDate(now.getDate() - dow);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const { data, error } = await supabase
    .from('work_hours')
    .select('date, hours, project:projects(name)')
    .gte('date', iso(monday))
    .lte('date', iso(sunday));
  if (error) throw error;

  const byDate = new Map<string, { hours: number; projects: Set<string> }>();
  for (const row of data as unknown as Array<{
    date: string;
    hours: number;
    project: { name: string } | null;
  }>) {
    const day = byDate.get(row.date) ?? { hours: 0, projects: new Set() };
    day.hours += row.hours;
    if (row.project?.name) day.projects.add(row.project.name);
    byDate.set(row.date, day);
  }

  const days: WeekDayEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = iso(d);
    const day = byDate.get(key);
    days.push({ date: key, hours: day?.hours ?? 0, projects: [...(day?.projects ?? [])] });
  }
  return days;
}

export interface PayslipReminder {
  show: boolean;
  monthLabel: string;
  missing: number;
}

/** Przypomnienie o uzupełnieniu specyfikacji: od 20. dnia, gdy brakuje. */
export async function fetchPayslipReminder(): Promise<PayslipReminder> {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pY = prev.getFullYear();
  const pM = prev.getMonth() + 1;
  const [empRes, payRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
      .eq('role', 'employee'),
    supabase.from('payslips').select('employee_id').eq('year', pY).eq('month', pM),
  ]);
  const employees = empRes.count ?? 0;
  const covered = new Set((payRes.data ?? []).map((r) => r.employee_id)).size;
  const missing = Math.max(employees - covered, 0);
  return {
    show: now.getDate() >= 20 && employees > 0 && missing > 0,
    monthLabel: format(prev, 'LLLL yyyy', { locale: pl }),
    missing,
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
