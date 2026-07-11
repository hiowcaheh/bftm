import type { Permission } from '@/lib/permissions';

interface PermissionGroup {
  label: string;
  items: Array<{ flag: Permission; label: string; description: string; sensitive?: boolean }>;
}

/** Ludzkie opisy flag uprawnień — używane w panelu pracownika. */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Projekty i klienci',
    items: [
      {
        flag: 'projects_view',
        label: 'Podgląd projektów',
        description: 'Widzi listę i szczegóły projektów',
      },
      {
        flag: 'projects_edit',
        label: 'Edycja projektów',
        description: 'Dodaje i edytuje projekty, zmienia statusy',
      },
      {
        flag: 'clients_view',
        label: 'Podgląd klientów',
        description: 'Widzi bazę klientów',
      },
      {
        flag: 'clients_edit',
        label: 'Edycja klientów',
        description: 'Dodaje i edytuje klientów',
      },
    ],
  },
  {
    label: 'Godziny i nieobecności',
    items: [
      {
        flag: 'hours_add_own',
        label: 'Własne godziny',
        description: 'Dodaje i poprawia własne wpisy godzin (szkice)',
      },
      {
        flag: 'hours_view_all',
        label: 'Godziny wszystkich',
        description: 'Widzi wszystkie godziny, nie tylko swoje',
      },
      {
        flag: 'hours_edit_all',
        label: 'Edycja godzin wszystkich',
        description: 'Edytuje i usuwa wpisy wszystkich (poza rozliczonymi)',
      },
      {
        flag: 'hours_approve',
        label: 'Zatwierdzanie godzin',
        description: 'Zatwierdza wpisy przed rozliczeniem',
      },
      {
        flag: 'absences_view_all',
        label: 'Nieobecności wszystkich',
        description: 'Widzi nieobecności całego zespołu',
      },
      {
        flag: 'absences_manage',
        label: 'Zarządzanie nieobecnościami',
        description: 'Dodaje i edytuje nieobecności wszystkich',
      },
    ],
  },
  {
    label: 'Koszty i oferty',
    items: [
      {
        flag: 'expenses_add',
        label: 'Dodawanie kosztów',
        description: 'Dodaje koszty i paragony',
      },
      {
        flag: 'expenses_view_all',
        label: 'Wszystkie koszty',
        description: 'Widzi koszty dodane przez innych',
      },
      {
        flag: 'offers_view',
        label: 'Podgląd ofert',
        description: 'Widzi oferty i kosztorysy',
      },
      {
        flag: 'offers_edit',
        label: 'Edycja ofert',
        description: 'Tworzy i edytuje oferty',
      },
    ],
  },
  {
    label: 'Raporty i finanse',
    items: [
      {
        flag: 'reports_view',
        label: 'Raporty',
        description: 'Widzi raporty godzin i rozliczenia',
      },
      {
        flag: 'finance_view',
        label: 'Dane finansowe',
        description: 'Widzi stawki, marże, koszty pracowników i wartości kontraktów',
        sensitive: true,
      },
    ],
  },
  {
    label: 'Pozostałe',
    items: [
      {
        flag: 'employees_view',
        label: 'Lista pracowników',
        description: 'Widzi listę pracowników (bez stawek)',
      },
      {
        flag: 'photos_upload',
        label: 'Zdjęcia projektów',
        description: 'Dodaje zdjęcia do projektów',
      },
      {
        flag: 'payslips_manage',
        label: 'Specyfikacje wypłaty',
        description: 'Wgrywa i zarządza specyfikacjami wypłaty pracowników',
      },
    ],
  },
];
