import type { Tables } from '@/types/database';
import type { PermissionMap } from '@/lib/permissions';

export type Profile = Tables<'profiles'>;

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'employee';
  permissions: PermissionMap;
  mustChangePassword: boolean;
  active: boolean;
}

export function toCurrentUser(profile: Profile): CurrentUser {
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    permissions: (profile.permissions ?? {}) as PermissionMap,
    mustChangePassword: profile.must_change_password,
    active: profile.active,
  };
}
