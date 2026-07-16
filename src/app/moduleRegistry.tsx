import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  LayoutDashboard,
  House,
  Clock,
  FileText,
  Users,
  Contact,
  Wallet,
  BarChart3,
  ReceiptText,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { Permission } from '@/lib/permissions';

export interface AppModule {
  id: string;
  /** Etykieta w nawigacji i nagłówkach — po polsku */
  label: string;
  icon: ComponentType<LucideProps>;
  path: string;
  /**
   * Wymagane uprawnienie; tablica = wystarczy dowolne z listy;
   * undefined = widoczny dla każdego zalogowanego.
   */
  requiredPermission?: Permission | Permission[];
  navPlacement: 'bottom' | 'more';
  element: LazyExoticComponent<ComponentType>;
}

/** Czy użytkownik (funkcja can z sesji) ma dostęp do modułu. */
export function canAccessModule(
  can: (p: Permission) => boolean,
  mod: Pick<AppModule, 'requiredPermission'>,
): boolean {
  if (!mod.requiredPermission) return true;
  const perms = Array.isArray(mod.requiredPermission)
    ? mod.requiredPermission
    : [mod.requiredPermission];
  return perms.some(can);
}

/**
 * REJESTR MODUŁÓW — jedyne miejsce definiujące nawigację i routing.
 * Nowy moduł = nowy folder w features/ + jeden wpis tutaj.
 */
export const modules: AppModule[] = [
  {
    id: 'dashboard',
    label: 'Pulpit',
    icon: LayoutDashboard,
    path: '/',
    navPlacement: 'bottom',
    element: lazy(() => import('@/features/dashboard/pages/DashboardPage')),
  },
  {
    id: 'projects',
    label: 'Projekty',
    icon: House,
    path: '/projekty',
    requiredPermission: 'projects_view',
    navPlacement: 'bottom',
    element: lazy(() => import('@/features/projects/pages/ProjectsPage')),
  },
  {
    id: 'timesheet',
    label: 'Godziny',
    icon: Clock,
    path: '/godziny',
    requiredPermission: 'hours_add_own',
    navPlacement: 'bottom',
    element: lazy(() => import('@/features/timesheet/pages/TimesheetPage')),
  },
  {
    id: 'offers',
    label: 'Oferty',
    icon: FileText,
    path: '/oferty',
    requiredPermission: 'offers_view',
    navPlacement: 'bottom',
    element: lazy(() => import('@/features/offers/pages/OffersPage')),
  },
  {
    id: 'clients',
    label: 'Klienci',
    icon: Contact,
    path: '/klienci',
    requiredPermission: 'clients_view',
    navPlacement: 'more',
    element: lazy(() => import('@/features/clients/pages/ClientsPage')),
  },
  {
    id: 'employees',
    label: 'Zespół',
    icon: Users,
    path: '/pracownicy',
    requiredPermission: 'employees_view',
    navPlacement: 'more',
    element: lazy(() => import('@/features/employees/pages/EmployeesPage')),
  },
  {
    id: 'finance',
    label: 'Finanse',
    icon: Wallet,
    path: '/finanse',
    // finance_view → pełny raport; same uprawnienia kosztowe → tylko paragony
    requiredPermission: ['finance_view', 'expenses_add', 'expenses_view_all'],
    navPlacement: 'more',
    element: lazy(() => import('@/features/finance/pages/FinancePage')),
  },
  {
    id: 'reports',
    label: 'Raporty',
    icon: BarChart3,
    path: '/raporty',
    requiredPermission: 'reports_view',
    navPlacement: 'more',
    element: lazy(() => import('@/features/reports/pages/ReportsPage')),
  },
  {
    id: 'payslips',
    label: 'Specyfikacje wypłaty',
    icon: ReceiptText,
    path: '/wyplaty',
    // widoczny dla każdego zalogowanego (pracownik widzi swoje, admin wszystkie)
    navPlacement: 'more',
    element: lazy(() => import('@/features/payslips/pages/PayslipsPage')),
  },
  {
    id: 'invoices',
    label: 'Specyfikacje faktury',
    icon: FileSpreadsheet,
    path: '/specyfikacje-faktury',
    requiredPermission: 'invoices_manage',
    navPlacement: 'more',
    element: lazy(() => import('@/features/invoices/pages/InvoicesPage')),
  },
  {
    id: 'settings',
    label: 'Ustawienia',
    icon: Settings,
    path: '/ustawienia',
    navPlacement: 'more',
    element: lazy(() => import('@/features/settings/pages/SettingsPage')),
  },
];

export const bottomNavModules = modules.filter((m) => m.navPlacement === 'bottom');
export const moreModules = modules.filter((m) => m.navPlacement === 'more');
