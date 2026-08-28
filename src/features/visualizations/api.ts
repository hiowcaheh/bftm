import { supabase } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/imageCompress';
import type { TablesInsert } from '@/types/database';
import type {
  PublicVisualization,
  Visualization,
  VisualizationPoint,
  VisualizationWithClient,
} from './types';

const BUCKET = 'visualization-photos';
const LIST_COLUMNS = '*, client:clients(id, name)';

// ── Lista / szczegóły ────────────────────────────────────────────────────────

export async function fetchVisualizations(): Promise<VisualizationWithClient[]> {
  const { data, error } = await supabase
    .from('visualizations')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as VisualizationWithClient[];
}

export async function fetchVisualization(
  id: string,
): Promise<{ visualization: VisualizationWithClient; points: VisualizationPoint[] } | null> {
  const [vizRes, pointsRes] = await Promise.all([
    supabase.from('visualizations').select(LIST_COLUMNS).eq('id', id).maybeSingle(),
    supabase
      .from('visualization_points')
      .select('*')
      .eq('visualization_id', id)
      .order('created_at'),
  ]);
  if (vizRes.error) throw vizRes.error;
  if (pointsRes.error) throw pointsRes.error;
  if (!vizRes.data) return null;
  return {
    visualization: vizRes.data as unknown as VisualizationWithClient,
    points: pointsRes.data,
  };
}

export async function createVisualization(
  payload: Partial<Visualization>,
): Promise<string> {
  const { data, error } = await supabase
    .from('visualizations')
    .insert(payload as TablesInsert<'visualizations'>)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateVisualization(
  id: string,
  patch: Partial<Visualization>,
): Promise<void> {
  const { error } = await supabase
    .from('visualizations')
    .update(patch as TablesInsert<'visualizations'>)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteVisualization(id: string): Promise<void> {
  // Najpierw zbierz ścieżki zdjęć do sprzątnięcia storage (kaskada usunie wiersze).
  const { data: points } = await supabase
    .from('visualization_points')
    .select('before_path, after_path')
    .eq('visualization_id', id);
  const paths = (points ?? [])
    .flatMap((p) => [p.before_path, p.after_path])
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase.from('visualizations').delete().eq('id', id);
  if (error) throw error;
}

export interface CreatorInfo {
  name: string;
  avatar_path: string | null;
}

/** Mapa id→{imię, avatar} (audyt „kto dodał/zrobił"). Profile czytelne dla aktywnych. */
export async function fetchCreators(ids: string[]): Promise<Record<string, CreatorInfo>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_path')
    .in('id', uniq);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((p) => [p.id, { name: p.full_name, avatar_path: p.avatar_path }]),
  );
}

// ── Punkty ───────────────────────────────────────────────────────────────────

export async function createPoint(
  payload: Omit<TablesInsert<'visualization_points'>, 'id'>,
): Promise<VisualizationPoint> {
  const { data, error } = await supabase
    .from('visualization_points')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePoint(
  id: string,
  patch: Partial<VisualizationPoint>,
): Promise<void> {
  const { error } = await supabase
    .from('visualization_points')
    .update(patch as TablesInsert<'visualization_points'>)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePoint(point: VisualizationPoint): Promise<void> {
  const paths = [point.before_path, point.after_path].filter(
    (p): p is string => !!p,
  );
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase
    .from('visualization_points')
    .delete()
    .eq('id', point.id);
  if (error) throw error;
}

// ── Zdjęcia (bucket publiczny, ścieżki losowe) ───────────────────────────────

export async function uploadVizPhoto(vizId: string, file: File): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${vizId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error('upload');
  return path;
}

export async function removeVizPhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export function vizPhotoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── Publikacja / token ───────────────────────────────────────────────────────

export async function publishVisualization(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('visualization_publish', { p_id: id });
  if (error) throw error;
  return data;
}

export async function ensureVizToken(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('visualization_ensure_token', { p_id: id });
  if (error) throw error;
  return data;
}

// ── Strona publiczna (klient, bez logowania) ─────────────────────────────────

export async function fetchPublicVisualization(
  token: string,
  track: boolean,
  session: string | null,
): Promise<PublicVisualization | null> {
  const { data, error } = await supabase.rpc('visualization_public', {
    p_token: token,
    p_track: track,
    p_session: session,
  });
  if (error) throw error;
  return (data as unknown as PublicVisualization | null) ?? null;
}

/** Publiczny adres wizualizacji (HashRouter). Ścieżka po szwedzku dla klienta. */
export function vizPublicUrl(token: string, preview = false): string {
  return `${window.location.origin}${window.location.pathname}#/visualisering/${token}${preview ? '?podglad=1' : ''}`;
}

// ── E-mail (reużycie RPC send_offer_email) ───────────────────────────────────

export interface SendVizEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendVisualizationEmail(input: SendVizEmailInput): Promise<void> {
  const { error } = await supabase.rpc('send_offer_email', {
    p_to: input.to,
    p_subject: input.subject,
    p_html: input.html,
  });
  if (error) throw new Error(error.message);
}
