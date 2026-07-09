# Moduły BFTM

1 sekcja = 1 moduł: co robi, tabele, uprawnienia. Aktualizowane po każdym etapie.

## dashboard — Pulpit

- **Stan**: Etap 1 — układ demonstracyjny (KPI 2×2, sekcja „Dziś w pracy", FAB).
- **Docelowo**: KPI z prawdziwych danych, „Dziś w pracy", ostatnie wpisy, szybkie akcje.
- **Tabele**: czyta agregaty z `work_hours`, `projects`, `expenses`, `absences`.
- **Uprawnienia**: widoczny dla każdego; kwoty tylko z `finance_view`.

## projects — Projekty

- **Stan**: placeholder (Etap 4).
- **Uprawnienia**: `projects_view` / `projects_edit`.

## timesheet — Godziny

- **Stan**: placeholder (Etap 5).
- **Uprawnienia**: `hours_add_own`, `hours_view_all`, `hours_edit_all`, `hours_approve`.

## offers — Oferty

- **Stan**: placeholder (Etap 7).
- **Uprawnienia**: `offers_view` / `offers_edit`.

## clients — Klienci

- **Stan**: placeholder (Etap 4).
- **Uprawnienia**: `clients_view` / `clients_edit`.

## employees — Pracownicy

- **Stan**: Etap 3 — lista z wyszukiwarką, dodawanie kont (hasło tymczasowe
  pokazane raz), profil: kontakt, panel 18 flag uprawnień z polskimi opisami,
  stawka z historią, dziennik aktywności (logowania + operacje admina),
  reset hasła, dezaktywacja/reaktywacja.
- **Tabele**: `profiles`, `employee_compensation`, `activity_log`; operacje na
  kontach przez RPC `admin_create_employee` / `admin_reset_password` /
  `admin_set_active` (security definer, tylko admin).
- **Uprawnienia**: lista `employees_view`; profil i zarządzanie tylko admin;
  stawki i aktywność chroni RLS (admin).

## expenses — Koszty

- **Stan**: placeholder (Etap 6).
- **Uprawnienia**: `expenses_add`, `expenses_view_all`.

## reports — Raporty

- **Stan**: placeholder (Etap 8).
- **Uprawnienia**: `reports_view`, `finance_view`.

## settings — Ustawienia

- **Stan**: Etap 2 — sekcja **Firma** (dane do PDF, branding, upload logo do bucketa
  `logos`; tylko admin), **Moje konto** (zmiana hasła: stare + nowe ×2), **Aplikacja**
  (wersja, „Sprawdź aktualizację" SW). Finanse/Oferty/Moduły w kolejnych etapach.
- **Tabele**: `settings` (klucze: company_branding [public], admin_login [public],
  company_details, finance, features, offer_numbering, offer_defaults, currency).
- **Uprawnienia**: zapis tylko admin (RLS); odczyt wg flag is_public/admin_only.

## auth — Logowanie

- **Stan**: Etap 2 — prawdziwe Supabase Auth: pole „Login lub e-mail" (literalne
  „admin" mapuje się na settings.admin_login), branding z ustawień na ekranie
  logowania, wymuszona zmiana hasła (must_change_password), guard tras,
  wylogowanie z czyszczeniem cache, dezaktywacja konta odcina sesję.
- **Tabele**: `profiles` (+ auth.users przez Supabase), `settings` (admin_login).
- **Edge Functions**: `bootstrap-admin` (w repo; admin utworzony ręcznie w SQL),
  `create-employee` i `reset-employee-password` — deploy w Etapie 3.
