import { supabase } from '@/lib/supabaseClient';

/** Surowe dane roku z RPC results_year (migracja 0073). Miesiące 1–12. */
export interface ResultsMonthRow {
  m: number;
  hours: number;
  people: number;
  projects: number;
  workDays: number;
  personDays: number;
  weekendDays: number;
  weekendHours: number;
  revenue: number;
  labor: number;
  expenses: number;
  newProjects: number;
}

export interface ResultsProjectRow {
  m: number;
  id: string;
  name: string;
  color: string | null;
  /** active / completed / paused / cancelled (od 0075) */
  status?: string;
  clientId: string | null;
  client: string | null;
  hours: number;
  revenue: number;
  cost: number;
}

export interface ResultsTeamRow {
  m: number;
  id: string;
  name: string;
  avatar: string | null;
  hours: number;
  days: number;
}

export interface ResultsInvoice {
  amount: number;
  sent: string;
  due: string | null;
  paid: string | null;
  clientId: string | null;
}

export interface ResultsYearData {
  year: number;
  firstDay: string | null;
  months: ResultsMonthRow[];
  projects: ResultsProjectRow[];
  team: ResultsTeamRow[];
  invoices: ResultsInvoice[];
  /** średni czas płacenia klienta (dni) — klucz: client id */
  clientPayDays: Record<string, number>;
  absences: Array<{ m: number; type: string; days: number }>;
}

export async function fetchResultsYear(year: number): Promise<ResultsYearData> {
  const { data, error } = await supabase.rpc('results_year', { p_year: year });
  if (error) throw error;
  return data as ResultsYearData;
}
