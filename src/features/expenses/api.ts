import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompress';
import type { ExpenseCategory } from '@/types/database';
import type { ExpenseInsert, ExpenseWithProject } from './types';

const COLUMNS = '*, project:projects(id, name, color)';

export interface ExpenseFilters {
  from: string;
  to: string;
  projectId?: string;
  category?: ExpenseCategory;
}

export async function fetchExpenses(filters: ExpenseFilters): Promise<ExpenseWithProject[]> {
  let query = supabase
    .from('expenses')
    .select(COLUMNS)
    .gte('date', filters.from)
    .lte('date', filters.to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.category) query = query.eq('category', filters.category);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ExpenseWithProject[];
}

export async function fetchProjectExpenses(projectId: string): Promise<ExpenseWithProject[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(COLUMNS)
    .eq('project_id', projectId)
    .order('date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as ExpenseWithProject[];
}

export async function createExpense(payload: ExpenseInsert): Promise<string> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInsert>,
): Promise<void> {
  const { error } = await supabase.from('expenses').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

/** Upload paragonu (kompresja → prywatny bucket receipts). Zwraca ścieżkę. */
export async function uploadReceipt(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const path = `paragon-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, compressed, { contentType: 'image/jpeg' });
  if (error) throw new Error('Nie udało się przesłać paragonu');
  return path;
}

/** Prywatny bucket — podgląd przez podpisany URL (1 h). */
export async function receiptUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
