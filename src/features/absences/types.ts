import type { AbsenceType, Tables, TablesInsert } from '@/types/database';

export type Absence = Tables<'absences'>;
export type AbsenceInsert = TablesInsert<'absences'>;

export interface AbsenceWithEmployee extends Absence {
  employee: { id: string; full_name: string } | null;
}

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  sick: 'Chorobowe',
  vacation: 'Urlop',
  unpaid: 'Bezpłatny',
  vab: 'VAB',
  other: 'Inne',
};

export const ABSENCE_TYPE_TONES: Record<
  AbsenceType,
  'error' | 'success' | 'neutral' | 'warning' | 'info'
> = {
  sick: 'error',
  vacation: 'success',
  unpaid: 'neutral',
  vab: 'warning',
  other: 'info',
};

/** Kolory komórek dziennika dla typów nieobecności. */
export const ABSENCE_TYPE_COLORS: Record<AbsenceType, string> = {
  sick: '#C62828',
  vacation: '#2E7D32',
  unpaid: '#9E9E9E',
  vab: '#E65100',
  other: '#1565C0',
};
