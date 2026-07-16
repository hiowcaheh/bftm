import { supabase } from '@/lib/supabaseClient';

/** Logo firmy z publicznego bucketa jako data URL — do osadzenia w PDF. */
export async function fetchLogoDataUrl(logoPath: string | null): Promise<string | null> {
  if (!logoPath) return null;
  try {
    const url = supabase.storage.from('logos').getPublicUrl(logoPath).data.publicUrl;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface InvoiceSpec {
  id: string;
  client_id: string | null;
  project_id: string;
  period_from: string;
  period_to: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
  /** Dołączane w liście (join) do wyświetlenia. */
  project?: { id: string; name: string; color: string | null } | null;
  client?: { id: string; name: string } | null;
}

export interface InvoiceSpecItem {
  entry_date: string;
  employee_name: string;
  activity_name: string | null;
  hours: number;
  note: string | null;
}

export interface InvoiceSpecInsert {
  client_id: string | null;
  project_id: string;
  period_from: string;
  period_to: string;
  title: string | null;
  created_by: string | null;
}

/** Lista zapisanych specyfikacji faktury (najnowsze u góry). */
export async function fetchInvoiceSpecs(): Promise<InvoiceSpec[]> {
  const { data, error } = await supabase
    .from('invoice_specs')
    .select(
      'id, client_id, project_id, period_from, period_to, title, created_by, created_at, ' +
        'project:projects(id, name, color), client:clients(id, name)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceSpec[];
}

export async function createInvoiceSpec(payload: InvoiceSpecInsert): Promise<InvoiceSpec> {
  const { data, error } = await supabase
    .from('invoice_specs')
    .insert(payload)
    .select(
      'id, client_id, project_id, period_from, period_to, title, created_by, created_at, ' +
        'project:projects(id, name, color), client:clients(id, name)',
    )
    .single();
  if (error) throw error;
  return data as unknown as InvoiceSpec;
}

export async function deleteInvoiceSpec(id: string): Promise<void> {
  const { error } = await supabase.from('invoice_specs').delete().eq('id', id);
  if (error) throw error;
}

/** Pozycje specyfikacji liczone na żywo z godzin (RPC security definer). */
export async function fetchInvoiceItems(
  projectId: string,
  from: string,
  to: string,
): Promise<InvoiceSpecItem[]> {
  const { data, error } = await supabase.rpc('invoice_spec_items', {
    p_project: projectId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    entry_date: string;
    employee_name: string;
    activity_name: string | null;
    hours: number | string;
    note: string | null;
  }>).map((r) => ({
    entry_date: r.entry_date,
    employee_name: r.employee_name,
    activity_name: r.activity_name,
    hours: Number(r.hours) || 0,
    note: r.note,
  }));
}
