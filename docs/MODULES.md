# Moduły BFTM

1 sekcja = 1 moduł: co robi, tabele, uprawnienia. Aktualizowane po każdym etapie.

## dashboard — Pulpit

- **Stan**: Etap 1 — układ demonstracyjny (KPI 2×2, sekcja „Dziś w pracy", FAB).
- **Docelowo**: KPI z prawdziwych danych, „Dziś w pracy", ostatnie wpisy, szybkie akcje.
- **Tabele**: czyta agregaty z `work_hours`, `projects`, `expenses`, `absences`.
- **Uprawnienia**: widoczny dla każdego; kwoty tylko z `finance_view`.

## projects — Projekty

- **Stan**: Etap 4 — lista (segmenty statusów z licznikami, wyszukiwarka, karty
  z paskiem koloru), szczegóły (klient, adres, terminy, rozliczenie, budżet
  godzin), formularz, zmiana statusu, usuwanie (admin). Zakładki Godziny/
  Koszty/Prace dodatkowe/Zdjęcia/Finanse dojdą w Etapach 5–8.
- **Aktywności**: `project_activities` — etapy/usługi definiowane na projekcie;
  pracownik wybiera aktywność przy wpisie godzin (wymagana, gdy projekt je ma);
  karta projektu pokazuje kto co robił i ile godzin per aktywność.
- **Tabele**: `projects`, `project_activities` (+ join `clients`); kolumny
  finansowe pobierane tylko przy finance_view (filtrowanie w api.ts).
- **Uprawnienia**: `projects_view` / `projects_edit`; usuwanie tylko admin.

## timesheet — Godziny

- **Stan**: Etap 5 — dodawanie ze stepperem ±0,5 h (skróty Dziś/Wczoraj,
  ostatnie projekty, „Zapisz i dodaj kolejny"), dziennik pracownicy × dni
  (tydzień/miesiąc, sumy, nieobecności w komórkach), lista wpisów z akcjami,
  zatwierdzanie szkiców okresu, filtr projektu.
- **Tabele**: `work_hours` (+ join projects, profiles).
- **Uprawnienia**: `hours_add_own`, `hours_view_all`, `hours_edit_all`,
  `hours_approve`; wpisy `invoiced` zmienia tylko admin (RLS).

## absences — Nieobecności

- **Stan**: Etap 5 — zgłaszanie zakresu z typem (Chorobowe/Urlop/Bezpłatny/
  VAB/Inne) i notatką, lista okresu, usuwanie wg uprawnień, ostrzeżenia
  o kolizjach z godzinami; widoczne w dzienniku i na Pulpicie.
- **Tabele**: `absences`.
- **Uprawnienia**: własne każdy; całość `absences_view_all` / `absences_manage`.

## offers — Oferty

- **Stan**: placeholder (Etap 7).
- **Uprawnienia**: `offers_view` / `offers_edit`.

## clients — Klienci

- **Stan**: Etap 4 — lista z wyszukiwarką i badge'ami (typ, omvänd byggmoms,
  ROT), karta klienta (kontakt, notatki, projekty klienta, szybkie „+ projekt"),
  CRUD w sheetach; usunięcie klienta odpina projekty (set null).
- **Tabele**: `clients`.
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

## finance — Finanse

- **Stan**: Etap 6b — zysk okresu live (wypracowane − koszty), kafle
  (Wypracowane/Koszty/Czeka na płatność/Opłacone), wykres słupkowy przychód
  vs koszty (tydzień: dni, miesiąc: tygodnie ISO), donut struktury kosztów,
  lista rentowności projektów; fakturowanie etapami — wiele faktur na
  projekt (kwota, opis etapu, wysłana → termin → opłacona) w sekcji
  „Finanse projektu" na karcie projektu (tabela `project_invoices`,
  migracja 0010).
- **Koszt pracy**: jak na lönespecifikation — stawka × (1 + arbetsgivaravgifter)
  (+ opcjonalny narzut firmy); rezerwa urlopowa doliczana tylko przy włączonej
  fladze include_vacation_in_labor_cost (Ustawienia → Finanse, migracja 0011).
  Liczone w RPC `finance_project_summary` / `finance_daily` (security definer,
  wymagają finance_view) — stawki pracowników nie opuszczają bazy.
- **Tabele**: `work_hours`, `employee_compensation`, `expenses`,
  `additional_works`, `projects` (kolumny invoice_* z migracji 0008).
- **Uprawnienia**: `finance_view` — pełny raport; bez niego zakładka pokazuje
  tylko paragony.

## expenses — Paragony (podstrona Finansów, `/finanse/paragony`)

- **Stan**: Etap 6 — miesiące z sumami, chipsy kategorii, filtr projektu,
  netto↔VAT↔brutto z autouzupełnianiem, paragon z aparatu (kompresja,
  prywatny bucket receipts, signed URL), szczegóły/edycja/usuwanie; sekcja
  na karcie projektu z rozbiciem wg kategorii; KPI na Pulpicie.
  Stara ścieżka `/koszty` przekierowuje.
- **Tabele**: `expenses` (+ join projects); Storage `receipts`.
- **Uprawnienia**: `expenses_add` (własne CRUD), `expenses_view_all`; RLS.

## profile — Mój profil

- **Stan**: Etap 6b — tap w swoje nazwisko w menu Więcej: telefon,
  personnummer, rozmiary robocze (koszulka/spodnie/buty); e-mail tylko do
  odczytu. Dane osobiste w `employee_private` — RLS: własny wiersz + admin
  (migracja 0009).
- **Tabele**: `profiles` (phone), `employee_private`.

## additional_works / project_photos (w module projects)

- **Prace dodatkowe**: statusy, suma zaakceptowanych (finance_view), CRUD
  przy projects_edit; rozliczone zmienia tylko admin (RLS).
- **Zdjęcia**: multi-upload z kompresją do bucketa project-photos, siatka,
  pełny ekran, usuwanie autor/admin (photos_upload).

## reports — Raporty

- **Stan**: placeholder (Etap 8).
- **Uprawnienia**: `reports_view`, `finance_view`.

## settings — Ustawienia

- **Stan**: Etap 2 — sekcja **Firma** (dane do PDF, branding, upload logo do bucketa
  `logos`; tylko admin), **Moje konto** (zmiana hasła: stare + nowe ×2), **Aplikacja**
  (wersja, „Sprawdź aktualizację" SW), **Finanse — koszt pracodawcy** (narzuty
  % do liczenia kosztu godziny; tylko admin). Oferty/Moduły w kolejnych etapach.
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
