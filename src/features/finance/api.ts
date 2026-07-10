import { supabase } from '@/lib/supabaseClient';
import type { Tables, TablesInsert } from '@/types/database';

export interface FinanceProjectSummary {
  project_id: string;
  name: string;
  color: string | null;
  status: string;
  billing_type: 'hourly' | 'fixed' | 'mixed';
  hourly_rate: number | null;
  fixed_value: number | null;
  hours_range: number;
  labor_cost_range: number;
  hours_total: number;
  labor_cost_total: number;
  expenses_range: number;
  expenses_total: number;
  additional_approved: number;
  invoiced_total: number;
  paid_total: number;
  awaiting_total: number;
  paid_range_total: number;
  invoice_count: number;
  next_due_at: string | null;
}

export interface FinanceDay {
  day: string;
  hours: number;
  labor_cost: number;
  revenue: number;
  expenses: number;
}

export type ProjectInvoice = Tables<'project_invoices'>;

/**
 * Agregaty finansowe przez RPC security definer — stawki pracowników
 * nie opuszczają bazy, klient dostaje wyłącznie policzone sumy.
 */
export async function fetchFinanceSummary(
  from: string,
  to: string,
): Promise<FinanceProjectSummary[]> {
  const { data, error } = await supabase.rpc('finance_project_summary', {
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return (data ?? []) as FinanceProjectSummary[];
}

export async function fetchFinanceDaily(from: string, to: string): Promise<FinanceDay[]> {
  const { data, error } = await supabase.rpc('finance_daily', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as FinanceDay[];
}

/** Wypracowana wartość projektu: ryczałt + godziny × stawka + zaakceptowane dodatkowe. */
export function projectValue(p: FinanceProjectSummary): number {
  const hourly =
    p.billing_type !== 'fixed' ? p.hours_total * (p.hourly_rate ?? 0) : 0;
  const fixed = p.billing_type !== 'hourly' ? (p.fixed_value ?? 0) : 0;
  return fixed + hourly + p.additional_approved;
}

export function projectCost(p: FinanceProjectSummary): number {
  return p.labor_cost_total + p.expenses_total;
}

// ── Faktury projektu (fakturowanie etapami — wiele faktur na projekt) ───────

export async function fetchProjectInvoices(projectId: string): Promise<ProjectInvoice[]> {
  const { data, error } = await supabase
    .from('project_invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProjectInvoice(
  payload: TablesInsert<'project_invoices'>,
): Promise<void> {
  const { error } = await supabase.from('project_invoices').insert(payload);
  if (error) throw error;
}

export async function updateProjectInvoice(
  id: string,
  patch: Partial<TablesInsert<'project_invoices'>>,
): Promise<void> {
  const { error } = await supabase.from('project_invoices').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProjectInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('project_invoices').delete().eq('id', id);
  if (error) throw error;
}
