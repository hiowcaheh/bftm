/**
 * Flagi uprawnień — klucze JSONB w profiles.permissions.
 * Admin ma wszystkie uprawnienia implicite.
 * UI ukrywa elementy bez uprawnień, ale prawdziwą ochroną jest RLS.
 */
export const PERMISSIONS = [
  'projects_view',
  'projects_edit',
  'clients_view',
  'clients_edit',
  'hours_add_own',
  'hours_view_all',
  'hours_edit_all',
  'hours_approve',
  'absences_view_all',
  'absences_manage',
  'expenses_add',
  'expenses_view_all',
  'offers_view',
  'offers_edit',
  'reports_view',
  'finance_view',
  'employees_view',
  'photos_upload',
  'payslips_manage',
  'invoices_manage',
  'checklist_private',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PermissionMap = Partial<Record<Permission, boolean>>;

/** Domyślne uprawnienia nowego pracownika: własne godziny + lista projektów. */
export const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionMap = {
  hours_add_own: true,
  projects_view: true,
};

export interface CurrentUserLike {
  role: 'admin' | 'employee';
  permissions: PermissionMap;
}

/**
 * Sprawdzenie uprawnienia. W Etapie 2/3 zostanie spięte z profilem
 * zalogowanego użytkownika (hook useCan w features/auth).
 */
export function can(
  user: CurrentUserLike | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions[permission] === true;
}
