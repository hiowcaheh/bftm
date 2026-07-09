import type { Tables } from '@/types/database';
import type { PermissionMap } from '@/lib/permissions';

export type Employee = Tables<'profiles'>;
export type Compensation = Tables<'employee_compensation'>;

export interface NewEmployee {
  full_name: string;
  email: string;
  phone: string;
  personnummer: string;
  temp_password: string;
  hourly_wage: number | null;
  permissions: PermissionMap;
}

export interface LoginActivity {
  id: string;
  action: string;
  created_at: string;
}

/** Generator hasła tymczasowego: 10 znaków bez mylących 0/O/l/1. */
export function generateTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
