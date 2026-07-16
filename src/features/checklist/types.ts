export type ChecklistScope = 'company' | 'private';
export type ChecklistPriority = 'low' | 'medium' | 'high';

export const PRIORITY_LABELS: Record<ChecklistPriority, string> = {
  high: 'Wysoki',
  medium: 'Średni',
  low: 'Niski',
};

export const PRIORITY_COLORS: Record<ChecklistPriority, string> = {
  high: '#C62828',
  medium: '#E65100',
  low: '#2E7D32',
};

/** Kolejność sortowania (0 = najważniejsze). */
export const PRIORITY_ORDER: Record<ChecklistPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface ChecklistItem {
  id: string;
  scope: ChecklistScope;
  project_id: string | null;
  projectName: string | null;
  projectColor: string | null;
  priority: ChecklistPriority;
  text: string;
  done: boolean;
  doneByName: string | null;
  done_at: string | null;
  createdByName: string | null;
  created_by: string | null;
  created_at: string;
}
