import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  LayoutDashboard,
  HardHat,
  Clock,
  FileText,
  Users,
  Contact,
  Receipt,
  BarChart3,
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
  /** Wymagane uprawnienie; undefined = widoczny dla każdego zalogowanego */
  requiredPermission?: Permission;
  navPlacement: 'bottom' | 'more';
  element: LazyExoticComponent<ComponentType>;
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
    icon: HardHat,
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
    label: 'Pracownicy',
    icon: Users,
    path: '/pracownicy',
    requiredPermission: 'employees_view',
    navPlacement: 'more',
    element: lazy(() => import('@/features/employees/pages/EmployeesPage')),
  },
  {
    id: 'expenses',
    label: 'Koszty',
    icon: Receipt,
    path: '/koszty',
    requiredPermission: 'expenses_add',
    navPlacement: 'more',
    element: lazy(() => import('@/features/expenses/pages/ExpensesPage')),
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
