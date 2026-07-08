# Architektura BFTM

Dokument utrzymywany na bieżąco — każdy etap dopisuje swoje decyzje.

## Zasady bezwzględne

1. **Rejestr modułów** (`src/app/moduleRegistry.tsx`) — nawigacja dolna, ekran „Więcej"
   i routing renderują się z jednej tablicy `modules`. Nowa funkcja = folder w
   `src/features/` + jeden wpis w rejestrze.
2. **Klucze cache tylko z `src/lib/queryKeys.ts`** — moduły inwalidują nawzajem swoje
   widoki przez ten jeden plik (np. mutacja godzin → `qk.dashboard.all`,
   `qk.projects.detail(id)`, `qk.reports.all`).
3. **Zero zapytań Supabase w komponentach** — wyłącznie `features/<m>/api.ts` + hooki
   w `features/<m>/hooks.ts`. Komponenty nie znają Supabase.
4. **Migracje przyrostowe** — `supabase/migrations/NNNN_opis.sql`; starych plików nigdy
   nie edytujemy.
5. **Wartości biznesowe w tabeli `settings`** — podatki, procenty, limity ROT, numeracja,
   feature flags. Nic nie jest zahardkodowane.
6. **Bezpieczeństwo**: RLS na każdej tabeli; `service_role` i klucz Anthropic wyłącznie
   w sekretach Edge Functions; UI ukrywa, RLS chroni.

## Warstwy

```
komponenty (features/*/components, pages)
   ↓ hooki (features/*/hooks.ts — useQuery/useMutation + inwalidacje przez qk)
      ↓ api (features/*/api.ts — jedyny styk z Supabase)
         ↓ lib/supabaseClient.ts (od Etapu 2)
```

## Efekt „zero ładowania"

- `PersistQueryClientProvider` + persister localStorage (`src/app/providers.tsx`):
  każdy widok najpierw pokazuje ostatnie dane z cache, potem cicho odświeża w tle.
- Skeletony wyłącznie przy pierwszym pobraniu w życiu aplikacji.
- Optimistic updates z rollbackiem dla mutacji (wzorzec od Etapu 4).
- Pole `buster` w persystencji unieważnia cache po niekompatybilnym wdrożeniu.

## Design tokens

Jedno źródło prawdy: blok `@theme` w `src/styles/index.css` (kolory, typografia
13/15/17/20/24/30, radiusy 16/10, cienie). Tailwind v4 emituje tokens jako zmienne CSS
na `:root`, a utility odwołują się do nich przez `var(...)` — przyszły dark mode to
nadpisanie zmiennych selektorem `[data-theme='dark']` bez zmian w komponentach.

## Routing i PWA na GitHub Pages

- `HashRouter` — Pages nie ma SPA fallback; hash unika hacków z 404.html.
- `base: '/bftm/'` w `vite.config.ts`; manifest `scope`/`start_url` na `/bftm/`.
- Service worker (`vite-plugin-pwa`, `registerType: 'prompt'`): precache shellu;
  Supabase REST GET → NetworkFirst, Storage → StaleWhileRevalidate; mutacje nigdy
  nie są cache'owane. Toast „Dostępna nowa wersja — Odśwież" przez `UpdatePrompt`.

## Decyzje etapów

### Etap 2

- Backend: projekt Supabase **BFTM** (`ixositdqghamqeproryp`, org. FirstChaos).
  Migracje 0001 (schemat + RLS + buckets + seed) i 0002 (hardening po advisory)
  wgrane przez MCP; kopie w `supabase/migrations/`.
- Pierwszy admin utworzony bezpośrednio w SQL (auth.users + identities + profil,
  bcrypt), bo deploy Edge Functions przez MCP wymaga zatwierdzenia niedostępnego
  w sesji; funkcja `bootstrap-admin` zostaje w repo dla przyszłych instalacji.
  `create-employee` i `reset-employee-password` do wdrożenia w Etapie 3.
- `src/types/database.ts` utrzymywany ręcznie w formacie `supabase gen types`
  (generator MCP też za bramką zatwierdzeń). UWAGA: wiersze tabel MUSZĄ być
  aliasami typów, nie interfejsami — interfejsy nie spełniają
  `Record<string, unknown>` z GenericTable i klient degeneruje do `never`.
- Sesja: `SessionProvider` (onAuthStateChange + profil przez TanStack Query);
  wylogowanie czyści cały cache Query. Dezaktywacja konta (`active=false`)
  wylogowuje natychmiast po odczycie profilu.
- Logowanie „admin" → e-mail z `settings.admin_login` (wiersz `is_public`,
  czytelny dla anon — świadomy kompromis na rzecz wygody logowania).
- `must_change_password=true` → router renderuje ekran zmiany hasła zamiast
  aplikacji; nie da się go ominąć nawigacją.

### Etap 1

- React 19 zamiast wskazanego w specyfikacji React 18 — bieżąca wersja stabilna,
  w pełni kompatybilna; brak powodu startować nowego projektu na starszej gałęzi.
- Tailwind v4 (plugin `@tailwindcss/vite`, tokens w CSS) zamiast klasycznego
  `tailwind.config.js` — mniej konfiguracji, tokens w jednym pliku z resztą stylów.
- Atrapa logowania: flaga w Zustand (persist). Żadnych haseł — do wymiany w Etapie 2
  na Supabase Auth.
- Ikony PWA generowane skryptem `scripts/generate-icons.mjs` (litera „B" na #CC0000);
  podmiana na logo firmy możliwa później bez zmian w manifescie.
