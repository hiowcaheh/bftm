# Changelog

## 0.5.2 — aktywności projektów + poprawki UX (2026-07-09)

- **Aktywności projektów**: na karcie projektu sekcja Aktywności (np. etapy,
  usługi); pracownik przy dodawaniu godzin wybiera projekt → aktywność
  (wymagana, gdy projekt jakieś ma); admin widzi podsumowanie „kto co robił
  i ile godzin" per aktywność; aktywność widoczna na listach i w dzienniku.
  Unikalność wpisu dnia rozszerzona o aktywność (migracja 0005).
- Ikona projektów zmieniona z kasku na domek w całej aplikacji.
- Jeszcze czulszy swipe między zakładkami (28 px, lekki gest).
- E-mail klienta wyeksponowany w formularzu z podpowiedzią (wysyłka ofert
  i wizualizacji w przyszłych etapach).
- Kalendarz zakresu nieobecności, numer tygodnia, naprawa pustych list —
  patrz 0.5.1 (hotfix wdrożony wcześniej tego dnia).

## 0.5.0 — Etap 5: Godziny + Dziennik + Nieobecności (2026-07-09)

- Dodawanie godzin: sheet ze stepperem ±0,5 h, skróty Dziś/Wczoraj, ostatnio
  używane projekty na górze listy, „Zapisz i dodaj kolejny"; admin wpisuje
  za dowolnego pracownika.
- Dziennik: siatka pracownicy × dni (tydzień/miesiąc, nawigacja okresów),
  sumy dzienne i na pracownika, kolorowe oznaczenia nieobecności, tap w
  komórkę → szczegóły dnia; filtr projektu.
- Lista wpisów pogrupowana po dniach z akcjami edytuj/duplikuj/usuń wg
  uprawnień; wpisy rozliczone chronione.
- Zatwierdzanie szkiców z okresu jednym przyciskiem (hours_approve).
- Nieobecności: zgłaszanie zakresu (chorobowe/urlop/bezpłatny/VAB/inne),
  lista okresu, ostrzeżenia o kolizji godzin z nieobecnością (w obie strony).
- Pulpit: prawdziwe KPI godzin miesiąca, sekcja „Dziś w pracy" (kto wpisał
  godziny, kto nieobecny), ostatnie 5 wpisów, FAB dodaje godziny.
- Karta projektu: sekcja Godziny — suma, pasek postępu vs budżet (czerwony
  po przekroczeniu), podział na pracowników, szybkie dodawanie.
- Projekty: etykiety rozliczeń Timmar / Fast pris / Mieszane, 16 kolorów.

## 0.4.0 — Etap 4: Klienci + Projekty (2026-07-09)

- Moduł Klienci: lista z wyszukiwarką i badge'ami (Firma/Prywatny, omvänd
  byggmoms, ROT), karta klienta z danymi kontaktowymi i projektami,
  CRUD w sheetach z sensownymi domyślnymi dla Szwecji.
- Moduł Projekty: lista kart z paskiem koloru i segmentami statusów
  (Aktywny/Oferta/Wstrzymany/Zakończony/Anulowany + liczniki), wyszukiwarka,
  formularz (klient, typ rozliczenia, stawka/ryczałt, budżet godzin, daty,
  kolor, opis), szczegóły z akcjami: edytuj, zmień status, usuń.
- Kolumny finansowe (stawka, ryczałt) nie trafiają nawet do zapytań
  użytkowników bez finance_view — filtrowanie w warstwie api.ts.
- Pulpit: kafel „Aktywne projekty" liczy prawdziwe dane; pozostałe KPI
  oznaczone „wkrótce".
- Poprawki: log logowań na zdarzeniu SIGNED_IN (wcześniej RLS po cichu
  odrzucał wpis), czulszy swipe między zakładkami (40 px).

## 0.3.0 — Etap 3: Pracownicy i uprawnienia (2026-07-09)

- Moduł Pracownicy: lista z wyszukiwarką, dodawanie kont (hasło tymczasowe
  pokazywane JEDEN raz z przyciskiem kopiuj), profil pracownika.
- Panel uprawnień: 18 flag pogrupowanych, z polskimi opisami i oznaczeniem
  danych wrażliwych; zapis natychmiastowy.
- Reset hasła przez admina (nowe hasło tymczasowe + wymuszenie zmiany +
  unieważnienie sesji), dezaktywacja/reaktywacja konta (ban w Auth).
- Stawka godzinowa z historią (valid_from) — tylko admin.
- Dziennik aktywności konta: logowania i operacje administracyjne
  (utworzenie, resety, dezaktywacje) — widoczny dla admina.
- Nawigacja (dolny pasek, menu Więcej) i trasy filtrowane uprawnieniami.
- Migracja 0003: funkcje RPC admin_create_employee / admin_reset_password /
  admin_set_active (security definer, twardy warunek is_admin).
- Wymuszona zmiana hasła przy pierwszym logowaniu obowiązuje też pracowników
  (ten sam mechanizm co u admina — nie do ominięcia).

## 0.2.1 — poprawki UX po testach na telefonie (2026-07-08)

- Szare tło aplikacji (#F2F2F5) — białe karty wyraźnie odcinają się od tła.
- „Więcej" jako nowoczesne slide-in menu z prawej (gest zamykania) zamiast
  osobnej strony.
- Swipe w lewo/prawo przełącza sąsiednie zakładki dolnej nawigacji.
- Niższa dolna belka nawigacji — mniej pustej przestrzeni.
- Duże logo firmy na całej szerokości ekranu logowania.
- Slogan firmy pod nazwą na ekranie logowania — edytowalny w Ustawienia → Firma.

## 0.2.0 — Etap 2: Supabase + Auth (2026-07-08)

- Backend BFTM: migracja 0001 (14 tabel, funkcje is_admin/has_perm, RLS na
  wszystkich tabelach, buckets logos/receipts/project-photos, seed settings ze
  zweryfikowanymi stawkami 2026) + migracja 0002 (hardening funkcji i storage).
- Konto administratora z hasłem startowym i wymuszoną zmianą przy pierwszym
  logowaniu; mapowanie loginu „admin" na e-mail administratora.
- Prawdziwe logowanie Supabase Auth (SessionProvider, guard tras, wylogowanie
  z czyszczeniem cache, polskie komunikaty błędów); usunięta atrapa z Etapu 1.
- Ustawienia: sekcja Firma (dane firmy, upload logo — widoczne na ekranie
  logowania), Moje konto (zmiana hasła), Sprawdź aktualizację.
- Ręcznie utrzymywane typy bazy `src/types/database.ts`; Edge Functions
  bootstrap-admin / create-employee / reset-employee-password w repo.

## 0.1.0 — Etap 1: Fundament (2026-07-08)

- Scaffold Vite + React + TypeScript (strict) + Tailwind CSS v4 z design tokens
  (#CC0000, skala 13–30, radius 16/10, cienie kart).
- Biblioteka komponentów UI: Button, Card, Input/Textarea, Select, DateField,
  NumberStepper, Badge, Tabs, ListRow/ListGroup, EmptyState, Skeleton, Toast, FAB,
  Avatar, SegmentedControl, SearchBar, Chips, Sheet (gest przeciągnięcia), ConfirmDialog.
- Rejestr modułów + HashRouter + AppLayout z dolną nawigacją (Pulpit • Projekty •
  Godziny • Oferty • Więcej) i ekranem „Więcej".
- Atrapa ekranu logowania (prawdziwe Supabase Auth w Etapie 2), guard tras, Error Boundary.
- TanStack Query z persystencją cache do localStorage (fundament „zero ładowania").
- PWA: manifest, ikony (generator `scripts/generate-icons.mjs`), service worker
  z promptem aktualizacji, strategie cache dla Supabase REST/Storage.
- Workflow deploy na GitHub Pages (`.github/workflows/deploy.yml`).
- Dokumentacja: README, docs/ARCHITECTURE.md, docs/MODULES.md.
