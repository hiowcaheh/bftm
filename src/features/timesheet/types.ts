import type { Tables, TablesInsert, WorkHoursStatus } from '@/types/database';

export type WorkHoursRow = Tables<'work_hours'>;
export type WorkHoursInsert = TablesInsert<'work_hours'>;

/** Wpis godzin z nazwami projektu i pracownika (join w api.ts). */
export interface WorkHoursEntry extends WorkHoursRow {
  project: { id: string; name: string; color: string | null } | null;
  employee: { id: string; full_name: string } | null;
}

export const HOURS_STATUS_LABELS: Record<WorkHoursStatus, string> = {
  draft: 'Szkic',
  approved: 'Zatwierdzone',
  invoiced: 'Rozliczone',
};

export const HOURS_STATUS_TONES: Record<
  WorkHoursStatus,
  'neutral' | 'success' | 'info' | 'warning'
> = {
  draft: 'neutral',
  approved: 'success',
  invoiced: 'info',
};

export interface HoursFilters {
  from: string;
  to: string;
  employeeId?: string;
  projectId?: string;
  status?: WorkHoursStatus;
}
