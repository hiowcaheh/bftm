import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompress';
import type { TablesInsert } from '@/types/database';
import type { ProjectInsert, ProjectPhoto, ProjectWithClient } from './types';

/**
 * Kolumny bez danych finansowych — dla użytkowników bez finance_view
 * wartości kontraktów nie trafiają nawet do odpowiedzi zapytania.
 */
const BASE_COLUMNS =
  'id, client_id, name, status, address, start_date, end_date, billing_type, estimated_hours, description, color, created_by, created_at';
const FINANCE_COLUMNS = `${BASE_COLUMNS}, hourly_rate, fixed_value`;

const withClient = (cols: string) => `${cols}, client:clients(id, name)`;

type ProjectRowRaw = Omit<ProjectWithClient, 'hourly_rate' | 'fixed_value'> &
  Partial<Pick<ProjectWithClient, 'hourly_rate' | 'fixed_value'>>;

function normalize(row: ProjectRowRaw): ProjectWithClient {
  return { hourly_rate: null, fixed_value: null, ...row };
}

export interface ProjectStat {
  totalHours: number;
  workers: string[];
}

/** Suma godzin + osoby per projekt (RPC agregujące, bez finansów). */
export async function fetchProjectStats(): Promise<Map<string, ProjectStat>> {
  const { data, error } = await supabase.rpc('project_stats');
  if (error) throw error;
  const map = new Map<string, ProjectStat>();
  for (const r of (data ?? []) as Array<{
    project_id: string;
    total_hours: number;
    workers: string[] | null;
  }>) {
    map.set(r.project_id, {
      totalHours: Number(r.total_hours) || 0,
      workers: r.workers ?? [],
    });
  }
  return map;
}

export async function fetchProjects(canFinance: boolean): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectRowRaw[]).map(normalize);
}

export async function fetchProject(
  id: string,
  canFinance: boolean,
): Promise<ProjectWithClient | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as ProjectRowRaw) : null;
}

export async function fetchProjectsByClient(
  clientId: string,
  canFinance: boolean,
): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(withClient(canFinance ? FINANCE_COLUMNS : BASE_COLUMNS))
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProjectRowRaw[]).map(normalize);
}

export async function createProject(payload: ProjectInsert): Promise<string> {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateProject(
  id: string,
  patch: Partial<ProjectInsert>,
): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ── Aktywności (usługi/etapy) projektu ──────────────────────────────────────

export async function fetchActivities(projectId: string) {
  const { data, error } = await supabase
    .from('project_activities')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function createActivity(projectId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('project_activities')
    .insert({ project_id: projectId, name: name.trim() });
  if (error) throw error;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('project_activities').delete().eq('id', id);
  if (error) throw error;
}

// ── Prace dodatkowe ─────────────────────────────────────────────────────────

export async function fetchAdditionalWorks(projectId: string) {
  const { data, error } = await supabase
    .from('additional_works')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAdditionalWork(
  payload: TablesInsert<'additional_works'>,
): Promise<void> {
  const { error } = await supabase.from('additional_works').insert(payload);
  if (error) throw error;
}

export async function updateAdditionalWork(
  id: string,
  patch: Partial<TablesInsert<'additional_works'>>,
): Promise<void> {
  const { error } = await supabase.from('additional_works').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAdditionalWork(id: string): Promise<void> {
  const { error } = await supabase.from('additional_works').delete().eq('id', id);
  if (error) throw error;
}

// ── Zdjęcia projektu ────────────────────────────────────────────────────────

export interface PhotoWithUrl extends ProjectPhoto {
  url: string | null;
}

export async function fetchPhotos(projectId: string): Promise<PhotoWithUrl[]> {
  const { data, error } = await supabase
    .from('project_photos')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (data.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from('project-photos')
    .createSignedUrls(
      data.map((p) => p.path),
      3600,
    );
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return data.map((p) => ({ ...p, url: urlByPath.get(p.path) ?? null }));
}

export async function uploadPhotos(
  projectId: string,
  files: File[],
  userId: string | null,
): Promise<void> {
  for (const file of files) {
    const compressed = await compressImage(file);
    const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('project-photos')
      .upload(path, compressed, { contentType: 'image/jpeg' });
    if (uploadError) throw new Error('Nie udało się przesłać zdjęcia');
    const { error } = await supabase.from('project_photos').insert({
      project_id: projectId,
      path,
      created_by: userId,
    });
    if (error) throw error;
  }
}

export async function deletePhoto(id: string, path: string): Promise<void> {
  await supabase.storage.from('project-photos').remove([path]);
  const { error } = await supabase.from('project_photos').delete().eq('id', id);
  if (error) throw error;
}
