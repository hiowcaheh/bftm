import { supabase } from '@/lib/supabaseClient';

export interface FinanceProjectSummary {
  project_id: string;
  name: string;
  color: string | null;
  status: string;
  billing_type: 'hourly' | 'fixed' | 'mixed';
  hourly_rate: number | null;
  fixed_value: number | null;
  invoice_sent_at: string | null;
  invoice_due_at: string | null;
  invoice_paid_at: string | null;
  invoice_amount: number | null;
  hours_range: number;
  labor_cost_range: number;
  hours_total: number;
  labor_cost_total: number;
  expenses_range: number;
  expenses_total: number;
  additional_approved: number;
}

export interface FinanceDay {
  day: string;
  hours: number;
  labor_cost: number;
  revenue: number;
  expenses: number;
}

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

export interface InvoiceUpdate {
  invoice_sent_at: string | null;
  invoice_due_at: string | null;
  invoice_paid_at: string | null;
  invoice_amount: number | null;
}

export async function updateProjectInvoice(
  projectId: string,
  patch: Partial<InvoiceUpdate>,
): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', projectId);
  if (error) throw error;
}
