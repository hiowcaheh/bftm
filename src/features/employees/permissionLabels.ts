import type { Permission } from '@/lib/permissions';

interface PermissionGroup {
  /** klucz tłumaczenia grupy: `permg.<key>` */
  key: string;
  items: Array<{ flag: Permission; sensitive?: boolean }>;
}

/**
 * Grupy flag uprawnień — panel pracownika. Etykiety i opisy pochodzą
 * ze słownika i18n: `perm.<flag>` (nazwa) i `perm.<flag>Desc` (opis).
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'projects',
    items: [
      { flag: 'projects_view' },
      { flag: 'projects_edit' },
      { flag: 'clients_view' },
      { flag: 'clients_edit' },
    ],
  },
  {
    key: 'hours',
    items: [
      { flag: 'hours_add_own' },
      { flag: 'hours_view_all' },
      { flag: 'hours_edit_all' },
      { flag: 'hours_approve' },
      { flag: 'absences_view_all' },
      { flag: 'absences_manage' },
    ],
  },
  {
    key: 'costs',
    items: [
      { flag: 'expenses_add' },
      { flag: 'expenses_view_all' },
      { flag: 'offers_view' },
      { flag: 'offers_edit' },
    ],
  },
  {
    key: 'reports',
    items: [
      { flag: 'reports_view' },
      { flag: 'finance_view', sensitive: true },
      { flag: 'payslips_manage', sensitive: true },
      { flag: 'invoices_manage' },
    ],
  },
  {
    key: 'other',
    items: [
      { flag: 'employees_view' },
      { flag: 'photos_upload' },
      { flag: 'checklist_private' },
    ],
  },
];
