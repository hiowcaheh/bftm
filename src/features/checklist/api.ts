import { supabase } from '@/lib/supabaseClient';
import type { ChecklistItem, ChecklistPriority, ChecklistScope } from './types';

const SELECT =
  'id, scope, project_id, priority, text, done, done_at, created_at, created_by, ' +
  'project:projects(name, color), ' +
  'creator:profiles!created_by(full_name), ' +
  'closer:profiles!done_by(full_name)';

interface RawRow {
  id: string;
  scope: ChecklistScope;
  project_id: string | null;
  priority: ChecklistPriority;
  text: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
  created_by: string | null;
  project: { name: string; color: string | null } | null;
  creator: { full_name: string } | null;
  closer: { full_name: string } | null;
}

export async function fetchChecklist(scope: ChecklistScope): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select(SELECT)
    .eq('scope', scope)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map((r) => ({
    id: r.id,
    scope: r.scope,
    project_id: r.project_id,
    projectName: r.project?.name ?? null,
    projectColor: r.project?.color ?? null,
    priority: r.priority,
    text: r.text,
    done: r.done,
    doneByName: r.closer?.full_name ?? null,
    done_at: r.done_at,
    createdByName: r.creator?.full_name ?? null,
    created_by: r.created_by,
    created_at: r.created_at,
  }));
}

export interface NewChecklistItem {
  scope: ChecklistScope;
  project_id: string | null;
  priority: ChecklistPriority;
  text: string;
}

export async function createChecklistItem(
  payload: NewChecklistItem,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('checklist_items').insert({
    scope: payload.scope,
    owner_id: payload.scope === 'private' ? userId : null,
    project_id: payload.scope === 'company' ? payload.project_id : null,
    priority: payload.priority,
    text: payload.text.trim(),
    created_by: userId,
  });
  if (error) throw error;
}

export async function setChecklistDone(
  id: string,
  done: boolean,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({
      done,
      done_by: done ? userId : null,
      done_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id);
  if (error) throw error;
}
