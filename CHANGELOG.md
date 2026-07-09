# Changelog

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
