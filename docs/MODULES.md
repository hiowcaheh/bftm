# Moduły BFTM

1 sekcja = 1 moduł: co robi, tabele, uprawnienia. Aktualizowane po każdym etapie.

## dashboard — Pulpit

- **Stan**: Etap 9 — KPI z prawdziwych danych (aktywne projekty, godziny
  i koszty miesiąca, **nieopłacone faktury** przy finance_view), blok
  „Czekają na zatwierdzenie" (hours_approve), „Dziś w pracy" / „Twój dzień",
  ostatnie wpisy lub „Ostatnie 7 dni", gradientowy CTA pracownika, FAB.
- **Tabele**: agregaty z `work_hours`, `projects`, `expenses`, `absences`,
  `project_invoices`.
- **Uprawnienia**: widoczny dla każdego; kwoty tylko z `finance_view`.

## offline / PWA (globalne)

- Pasek offline (`OfflineBanner`) gdy brak sieci; dane z cache TanStack
  Query (persist w localStorage). Manifest + ikony (192/512/maskable),
  theme-color, meta Apple w `index.html` / `vite.config.ts`.

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

- **Stan**: Etap 7 — lista ze statusami, kreator (klient, pozycje z moms
  i flagą robocizny, ROT-avdrag, omvänd byggmoms, numeracja OF-RRRR-NNN
  przez RPC `offer_next_number`), publikacja nadaje token
  (`offer_publish`); udostępnianie: link / share / mail po szwedzku.
- **Strona publiczna** `/oferta/:token` (bez logowania, po szwedzku,
  szata firmowa): specyfikacja, sumy, Acceptera/Avböj z komentarzem —
  `offer_public` / `offer_respond` (security definer, anon; szkice
  niedostępne); odpowiedź tworzy powiadomienia właścicieli; `viewed_at`
  przy pierwszym otwarciu.
- **Tabele**: `offers` (+ title, public_token, sent/viewed/responded_at,
  response_comment — migracja 0012), `offer_items`; snapshot klienta
  zamrażany przy publikacji.
- **Uprawnienia**: `offers_view` / `offers_edit`; klient tylko przez RPC.

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

## payslips — Specyfikacje wypłaty (lönespec)

- **Stan**: właściciel (admin) wgrywa lönespec (PDF/zdjęcie) per pracownik
  i miesiąc; pracownik widzi tylko swoje. Podgląd pełnoekranowy, podmiana,
  usuwanie; powiadomienie do pracownika po wysłaniu. Belka na Pulpicie
  + pozycja w Więcej (widoczna dla każdego zalogowanego).
- **Tabele**: `payslips` (unikat employee+rok+miesiąc); Storage `payslips`
  (prywatny, signed URL). RLS: select własne/admin, zapis tylko admin;
  polityki storage po prefiksie ścieżki = uuid pracownika (migracja 0019).

## reports — Raporty

- **Stan**: Etap 8 — zestawienie godzin miesiąca; zakładka Pracownicy
  (suma per pracownik + rozbicie na projekty, statusy zatwierdzone/szkic,
  koszt pracy przy finance_view — pod wypłaty), zakładka Projekty (godziny,
  liczba pracowników, stawka klienta i wartość do fakturowania); nagłówek
  z sumami; „Udostępnij / kopiuj raport" (tekst przez share lub schowek).
- **Dane**: RPC `report_hours` (security definer, wymaga reports_view lub
  finance_view) — agreguje `work_hours` × `employee_compensation` /
  `projects.hourly_rate`; kwoty tylko przy finance_view (migracja 0016).
- **Porównanie**: suma godzin vs poprzedni miesiąc (RPC `report_hours_total`).
- **Udostępnianie linkiem** `/raport/:token` (bez logowania, szata firmy):
  zamrożony snapshot w `report_shares`, opcja „bez kwot"; RPC
  `report_share_create` / `report_share_public` (anon, security definer;
  migracja 0017).
- **Uprawnienia**: `reports_view` (godziny) / `finance_view` (kwoty).

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
