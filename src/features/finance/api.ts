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

/** Wszystkie faktury projektów (sekcja w Finansach). */
export interface AllInvoice extends ProjectInvoice {
  project: { name: string; color: string | null } | null;
}

export async function fetchAllInvoices(): Promise<AllInvoice[]> {
  const { data, error } = await supabase
    .from('project_invoices')
    .select('*, project:projects(name, color)')
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return data as unknown as AllInvoice[];
}

/** Podpowiedź „do zafakturowania" — godzinówka albo pozostałe fastpris. */
export interface InvoiceSuggestion {
  projectId: string;
  name: string;
  color: string | null;
  kind: 'hours' | 'fixed';
  hours: number;
  amount: number;
  from: string;
  to: string;
}

export async function fetchInvoiceSuggestions(): Promise<InvoiceSuggestion[]> {
  const [hoursRes, projectsRes, invoicesRes] = await Promise.all([
    supabase
      .from('work_hours')
      .select('date, hours, project:projects(id, name, color, status, billing_type, hourly_rate)')
      .eq('status', 'approved')
      .is('invoice_batch_id', null),
    supabase
      .from('projects')
      .select('id, name, color, billing_type, fixed_value')
      .eq('status', 'active')
      .in('billing_type', ['fixed', 'mixed']),
    supabase.from('project_invoices').select('project_id, amount'),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (invoicesRes.error) throw invoicesRes.error;

  const suggestions: InvoiceSuggestion[] = [];

  // godzinówka: zatwierdzone, niezafakturowane godziny aktywnych projektów
  const byProject = new Map<string, InvoiceSuggestion>();
  for (const row of (hoursRes.data ?? []) as unknown as Array<{
    date: string;
    hours: number;
    project: {
      id: string;
      name: string;
      color: string | null;
      status: string;
      billing_type: string;
      hourly_rate: number | null;
    } | null;
  }>) {
    const p = row.project;
    if (!p || p.status !== 'active') continue;
    if (p.billing_type !== 'hourly' && p.billing_type !== 'mixed') continue;
    if (!p.hourly_rate) continue;
    const s =
      byProject.get(p.id) ??
      ({
        projectId: p.id,
        name: p.name,
        color: p.color,
        kind: 'hours',
        hours: 0,
        amount: 0,
        from: row.date,
        to: row.date,
      } satisfies InvoiceSuggestion);
    s.hours += row.hours;
    s.amount = Math.round(s.hours * p.hourly_rate * 100) / 100;
    if (row.date < s.from) s.from = row.date;
    if (row.date > s.to) s.to = row.date;
    byProject.set(p.id, s);
  }
  suggestions.push(...byProject.values());

  // fastpris: umówiona kwota minus wszystko, co już zafakturowane
  const invoicedByProject = new Map<string, number>();
  for (const inv of invoicesRes.data ?? []) {
    invoicedByProject.set(
      inv.project_id,
      (invoicedByProject.get(inv.project_id) ?? 0) + Number(inv.amount),
    );
  }
  for (const p of projectsRes.data ?? []) {
    const remaining = (p.fixed_value ?? 0) - (invoicedByProject.get(p.id) ?? 0);
    if (remaining > 0) {
      suggestions.push({
        projectId: p.id,
        name: p.name,
        color: p.color,
        kind: 'fixed',
        hours: 0,
        amount: remaining,
        from: '',
        to: '',
      });
    }
  }

  return suggestions.sort((a, b) => b.amount - a.amount);
}

/** Suma zatwierdzonych, niezafakturowanych godzin projektu w okresie. */
export async function fetchUninvoicedHours(
  projectId: string,
  from: string,
  to: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('work_hours')
    .select('hours')
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .is('invoice_batch_id', null)
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + r.hours, 0);
}

/** Faktura z godzin: RPC liczy kwotę i oznacza godziny jako zafakturowane. */
export async function invoiceProjectHours(args: {
  projectId: string;
  from: string;
  to: string;
  sentAt: string;
  dueAt: string | null;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('invoice_project_hours', {
    p_project: args.projectId,
    p_from: args.from,
    p_to: args.to,
    p_sent: args.sentAt,
    p_due: args.dueAt,
    p_note: args.note,
  });
  if (error) throw error;
}
