import { supabase } from '@/lib/supabaseClient';

export interface DashboardKpi {
  activeProjects: number;
}

/** Pierwsze prawdziwe KPI — kolejne (godziny, koszty, marża) dojdą w Etapach 5–9. */
export async function fetchKpi(): Promise<DashboardKpi> {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  if (error) throw error;
  return { activeProjects: count ?? 0 };
}
