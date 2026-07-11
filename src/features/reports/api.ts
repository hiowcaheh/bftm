import { supabase } from '@/lib/supabaseClient';

export interface ReportEmployee {
  id: string;
  name: string;
  total: number;
  approved: number | null;
  draft: number | null;
  invoiced: number | null;
  labor_cost: number | null;
  projects: Array<{ name: string; color: string | null; hours: number }> | null;
}

export interface ReportProject {
  id: string;
  name: string;
  color: string | null;
  billing_type: 'hourly' | 'fixed' | 'mixed';
  total: number;
  employees: number;
  labor_cost: number | null;
  hourly_rate: number | null;
  billable: number | null;
}

export interface HoursReport {
  by_employee: ReportEmployee[];
  by_project: ReportProject[];
  total_hours: number;
  expenses: number | null;
  finance: boolean;
}

/** Zestawienie godzin okresu (RPC security definer; kwoty tylko finance_view). */
export async function fetchHoursReport(from: string, to: string): Promise<HoursReport> {
  const { data, error } = await supabase.rpc('report_hours', { p_from: from, p_to: to });
  if (error) throw error;
  return data as unknown as HoursReport;
}

/** Sama suma godzin okresu — do porównania z poprzednim miesiącem. */
export async function fetchHoursTotal(from: string, to: string): Promise<number> {
  const { data, error } = await supabase.rpc('report_hours_total', {
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Tworzy współdzielony link do raportu (zamrożony snapshot). */
export async function createReportShare(
  from: string,
  to: string,
  title: string,
  includeAmounts: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc('report_share_create', {
    p_from: from,
    p_to: to,
    p_title: title.trim() || null,
    p_include_amounts: includeAmounts,
  });
  if (error) throw error;
  return data as string;
}

export function reportShareUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/raport/${token}`;
}

export interface PublicReport {
  title: string | null;
  period_from: string;
  period_to: string;
  created_at: string;
  report: HoursReport;
  company: { name?: string; org_nr?: string };
  branding: { name?: string; slogan?: string; logo_path?: string | null };
}

export async function fetchPublicReport(token: string): Promise<PublicReport | null> {
  const { data, error } = await supabase.rpc('report_share_public', { p_token: token });
  if (error) throw error;
  return (data as unknown as PublicReport | null) ?? null;
}
