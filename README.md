# BFTM — Zarządzanie firmą budowlaną

Mobilna aplikacja PWA do prowadzenia firmy budowlanej w Szwecji: projekty, dziennik
godzin, klienci, koszty, oferty z ROT / omvänd byggmoms, raporty pod faktury i analityka
rentowności. Interfejs w 4 językach (PL domyślnie + SV / EN / UK — wybór w Ustawieniach).

Produkcja: **https://app.bftm.se** (custom domena, GitHub Pages).

## Stack

- **Vite + React + TypeScript (strict)**, Tailwind CSS v4 (design tokens w `src/styles/index.css`)
- **TanStack Query v5** z persystencją cache do localStorage (efekt „zero ładowania")
- **Zustand** (stan UI), **React Router (HashRouter)** — kompatybilny z GitHub Pages
- **Supabase** (Auth + Postgres z RLS + Storage + Edge Functions) — od Etapu 2
- **vite-plugin-pwa** — manifest, service worker, aktualizacje z promptem

## Uruchomienie dev

```bash
npm install
cp .env.example .env.local   # od Etapu 2: uzupełnij URL i anon key Supabase
npm run dev
```

Aplikacja działa pod `http://localhost:5173/`.

## Build i deploy

```bash
npm run build    # tsc -b && vite build → dist/
npm run preview  # lokalny podgląd builda
```

Deploy: push do `main` uruchamia `.github/workflows/deploy.yml` → GitHub Pages
pod custom domeną **app.bftm.se** (CNAME w workflow). Wymagane sekrety repo
(Settings → Secrets → Actions): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Architektura w pigułce

- `src/app/moduleRegistry.tsx` — **rejestr modułów**: nawigacja, routing i ekran „Więcej"
  renderują się z tej tablicy. Nowy moduł = folder w `features/` + jeden wpis.
- `src/features/<moduł>/` — `api.ts` (jedyne miejsce zapytań Supabase), `hooks.ts`,
  `components/`, `pages/`, `types.ts`.
- `src/lib/queryKeys.ts` — wspólna konwencja kluczy cache; mutacje inwalidują klucze
  innych modułów wyłącznie przez ten plik.
- `src/lib/permissions.ts` — flagi uprawnień i `can()`; UI ukrywa, RLS chroni.
- `supabase/migrations/` — wyłącznie przyrostowe migracje SQL (od Etapu 2).

Szczegóły: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) i [docs/MODULES.md](docs/MODULES.md).
