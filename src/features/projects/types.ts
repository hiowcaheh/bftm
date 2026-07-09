import type { ProjectStatus, Tables, TablesInsert } from '@/types/database';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;

/** Projekt z dołączoną nazwą klienta (join w api.ts). */
export interface ProjectWithClient extends Project {
  client: { id: string; name: string } | null;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  offer: 'Oferta',
  active: 'Aktywny',
  paused: 'Wstrzymany',
  completed: 'Zakończony',
  cancelled: 'Anulowany',
};

export const PROJECT_STATUS_TONES: Record<
  ProjectStatus,
  'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info'
> = {
  offer: 'info',
  active: 'success',
  paused: 'warning',
  completed: 'neutral',
  cancelled: 'error',
};

export const BILLING_TYPE_LABELS: Record<Project['billing_type'], string> = {
  hourly: 'Godzinowe',
  fixed: 'Ryczałt',
  mixed: 'Mieszane',
};

/** Kolory paska projektu do wyboru w formularzu. */
export const PROJECT_COLORS = [
  '#CC0000',
  '#E65100',
  '#F9A825',
  '#2E7D32',
  '#00838F',
  '#1565C0',
  '#6A1B9A',
  '#546E7A',
];
