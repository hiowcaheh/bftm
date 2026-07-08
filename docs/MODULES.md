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

- **Stan**: placeholder (Etap 3).
- **Uprawnienia**: `employees_view`; zarządzanie tylko admin.

## expenses — Koszty

- **Stan**: placeholder (Etap 6).
- **Uprawnienia**: `expenses_add`, `expenses_view_all`.

## reports — Raporty

- **Stan**: placeholder (Etap 8).
- **Uprawnienia**: `reports_view`, `finance_view`.

## settings — Ustawienia

- **Stan**: Etap 1 — tylko wersja aplikacji; sekcje Firma/Finanse/Oferty/Moduły/Moje
  konto od Etapu 2.
- **Uprawnienia**: sekcje firmowe tylko admin; „Moje konto" dla każdego.

## auth — Logowanie

- **Stan**: Etap 1 — atrapa (Zustand persist, bez haseł).
- **Docelowo**: Supabase Auth, mapowanie loginu „admin" na e-mail z ustawień,
  wymuszenie zmiany hasła, bootstrap pierwszego admina (Edge Function).
