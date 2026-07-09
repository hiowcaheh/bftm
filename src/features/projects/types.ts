import type { ProjectStatus, Tables, TablesInsert } from '@/types/database';

export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type ProjectActivity = Tables<'project_activities'>;

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
  hourly: 'Timmar',
  fixed: 'Fast pris',
  mixed: 'Mieszane',
};

/** Kolory paska projektu do wyboru w formularzu. */
export const PROJECT_COLORS = [
  '#CC0000',
  '#D32F2F',
  '#E65100',
  '#F57C00',
  '#F9A825',
  '#AFB42B',
  '#2E7D32',
  '#00897B',
  '#00838F',
  '#0288D1',
  '#1565C0',
  '#3949AB',
  '#6A1B9A',
  '#AD1457',
  '#5D4037',
  '#546E7A',
];
