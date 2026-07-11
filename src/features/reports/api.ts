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
  finance: boolean;
}

/** Zestawienie godzin okresu (RPC security definer; kwoty tylko finance_view). */
export async function fetchHoursReport(from: string, to: string): Promise<HoursReport> {
  const { data, error } = await supabase.rpc('report_hours', { p_from: from, p_to: to });
  if (error) throw error;
  return data as unknown as HoursReport;
}
