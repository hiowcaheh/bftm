# BFTM — przewodnik dla Claude

Aplikacja PWA do zarządzania firmą budowlaną **BFTM Fasad & Bygg AB** (Szwecja).
Właściciel/admin: Mateusz (język polski). Pracownicy: PL/SV/EN/UK — aplikacja ma
pełne i18n. Produkcja: **https://app.bftm.se** (osobna od strony wizytówki bftm.se).

## Komendy

```bash
npm run dev        # dev server (http://localhost:5173/)
npm run build      # tsc -b && vite build → dist/  (MUSI przejść przed commitem)
npm run lint       # oxlint — 0 błędów wymagane (warningi fast-refresh są znane)
npx tsc --noEmit   # szybki typecheck
```

## Deploy (zawsze ta ścieżka)

1. Commit na branch `claude/construction-pwa-sweden-wa6yqd`, push z `-u origin`.
2. PR do `main` → merge → workflow `.github/workflows/deploy.yml` (peaceiris,
   `cname: app.bftm.se`) publikuje `dist/` na gh-pages.
3. Weryfikacja: run „deploy" musi być zielony, np.
   `gh api "repos/hiowcaheh/bftm/actions/workflows/deploy.yml/runs?per_page=1"`.
   Po merge: `git checkout -B <branch> origin/main` + push `--force-with-lease`
   (branch startuje od świeżego main). Gdy GitHub Pages zawiśnie na
   „updating_pages", pomaga ponowny deploy (patrz 0.45.2–0.45.4 w CHANGELOG).
4. Sekrety repo: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. Wersję (`APP_VERSION` w `src/features/settings/pages/SettingsPage.tsx`) podbijamy
   przy każdej zmianie + wpis w `CHANGELOG.md`. Użytkownik sprawdza wersję w Ustawieniach.

## Stack i twarde zasady

- Vite 8 + React 19 + TS strict + Tailwind v4 (tokeny w `src/styles/index.css`;
  akcent `--color-accent: #cc0000`). HashRouter (GitHub Pages). Zustand tylko do UI.
- TanStack Query v5 + PersistQueryClientProvider (localStorage) — **nigdy nie trzymać
  Map/Set w danych query** (nie serializują się).
- Rejestr modułów `src/app/moduleRegistry.tsx` — nawigacja/routing/„Więcej" z jednej
  tablicy. Nowy moduł = folder w `features/` + wpis + klucz `nav.<id>` w słowniku i18n.
- Zapytania Supabase TYLKO w `features/<m>/api.ts`; hooki w `hooks.ts`; klucze cache
  TYLKO z `src/lib/queryKeys.ts`.
- Uprawnienia: `src/lib/permissions.ts` (flagi + `can()`); UI ukrywa, RLS chroni.
  Etykiety flag: słownik i18n `perm.*` + grupy `permg.*` (`features/employees/permissionLabels.ts`).
- Migracje: `supabase/migrations/NNNN_*.sql`, wyłącznie przyrostowe. Wykonujemy przez
  MCP `apply_migration` na projekcie **ixositdqghamqeproryp** (BFTM), a do repo
  wrzucamy kopię (przy długich — stub z opisem). Po DDL: `get_advisors`.
- Nowe tabele/RPC dopisujemy ręcznie do `src/types/database.ts`.

## i18n (od 0.30.x) — WAŻNE przy każdej nowej funkcji

- Własny lekki system: `src/lib/i18n/` — `types.ts` (Lang: pl|sv|en|uk),
  `context.tsx` (I18nProvider, `useI18n()` → `{ lang, setLang, t, tp, dateLocale }`,
  `useT()`), `dict.ts` (słowniki; **polski = źródło prawdy i fallback**).
- Poza Reactem (toasty w hookach, api): `translate(key, vars)`, `translateP(key, n)`,
  `activeDateLocale()` — importy z `@/lib/i18n/context`.
- Liczba mnoga: węzły `{ one, few, many, other }` + `tp()` (Intl.PluralRules).
- Interpolacja: `{zmienna}` w stringach, `t('klucz', { zmienna: wartość })`.
- Daty: date-fns z `dateLocale` (React) albo `activeDateLocale()` (helpery w
  `src/lib/format.ts` już to robią).
- **Każdy nowy string UI musi iść przez słownik we wszystkich 4 językach.**
- Wyjątki celowo NIE tłumaczone (klient końcowy widzi szwedzki):
  `features/offers/pages/PublicOfferPage.tsx`, `features/offers/emailTemplate.ts`,
  `features/reports/pages/PublicReportPage.tsx`, PDF-y (`features/invoices/pdf.ts`),
  `features/visualizations/pages/PublicVisualizationPage.tsx`,
  `features/visualizations/emailTemplate.ts`.

## Supabase (projekt: BFTM / ixositdqghamqeproryp, eu-central-1)

- Auth: konta zakłada wyłącznie admin przez RPC `admin_create_employee`
  (security definer). Reset hasła: `admin_reset_password`. Dezaktywacja:
  `admin_set_active` (ban + ścięcie sesji).
  **Pracowników nie usuwamy (0.66, migracja 0080):** `admin_archive_employee` =
  `admin_set_active(false)` + `profiles.archived_at`; dane (godziny, stawki, wypłaty)
  zostają dla Finansów i Rezultatu. Powrót: `admin_restore_employee` (logowanie dalej
  zablokowane do aktywacji); trigger `profiles_unarchive_on_activate` zdejmuje archiwum
  przy aktywacji. Ekran Zespół → Archiwum. `admin_delete_employee` = blokada (raise).
  Przycisk archiwum pokazuje się, gdy profil ma kolumnę `archived_at` (`archiveReady`).
  UWAGA: `auth.refresh_tokens.user_id` to **varchar** — porównania z uuid wymagają `::text`.
- Wychodzący HTTP z Postgresa: extension `http` — Resend (`send_offer_email`,
  klucz w tabeli `app_secrets`), lookup orgnr przez VATComply
  (`lookup_company_by_orgnr`; ec.europa.eu blokuje IP datacenter).
- Realtime: tabela `checklist_items` (publikacja supabase_realtime + replica identity
  full); frontend subskrybuje w `features/checklist/hooks.ts`.
- Web Push (0.33.x): własny SW `src/sw.ts` (strategia injectManifest w vite.config;
  precache + runtime cache + handler push/notificationclick). Subskrypcje w tabeli
  `push_subscriptions` (RLS owner-only), klient w `src/lib/push.ts` (klucz publiczny
  VAPID zaszyty), przełącznik w Ustawieniach. Wysyłka: trigger `notifications_push`
  → pg_net POST → Edge Function `push` (supabase/functions/push; czyta sekrety
  VAPID z `app_secrets`, autoryzacja nagłówkiem x-push-secret).
- Funkcje publiczne (anon): tylko `offer_public`, `offer_respond`,
  `report_share_public`, `visualization_public` (0057) i `unread_count_for_endpoint`
  (SW, 0040). Reszta ma revoke dla anon (migracja 0035).
- RLS: wszystkie polityki używają `(select auth.uid())` (migracja 0036) — nowe
  polityki pisać tak samo.
- Storage buckets: `logos`, `avatars`, `visualization-photos` (public), `receipts`, `payslips`,
  `project-photos` (prywatne, signed URLs). Bezpośredni DELETE na storage.objects
  z SQL jest zablokowany — used Storage API/dashboard.
- Do PDF logo pobieramy przez `supabase.storage.from('logos').download()`
  (fetch na public URL bywa blokowany).

## Ważne reguły domenowe (łatwo zepsuć)

- Godziny na projekcie: pracownik widzi łączną sumę i pasek TYLKO gdy projekt ma
  budżet godzin; podział na osoby tylko admin / `hours_view_all`. Wymuszone też
  w RPC `project_stats` (migracje 0065–0066), nie tylko w UI.
- Projekt firmowy („bank godzin") = projekt, którego klient ma nazwę równą nazwie
  naszej firmy (`ProjectCard` → `isInternal`): czerwony tint + logo, uproszczony
  widok dla pracownika.
- Wizualizacje (0.45+): MapLibre + MapTiler (klucz publiczny w `map.ts`,
  override `VITE_MAPTILER_KEY`); chunk mapy poza precache SW (`globIgnores`
  w vite.config). Flagi `visualizations_manage` / `visualizations_work`.
- Aktualizacje PWA (0.59): `src/app/UpdatePrompt.tsx` pokazuje BLOKUJĄCE okno
  (bez X/„Później") — nie wracać do toastu, pracownicy go pomijali.
- Animacje (0.59): klasy w `index.css` (`animate-logo-wipe`, `animate-sheen`,
  `animate-draw-check`, `animate-pop-in`) + blok `prefers-reduced-motion`.
  Logo w `AppLayout` odpala się przy starcie i visibilitychange, nie przy
  zmianie zakładek. Zielona karta sukcesu: `DashboardPage` + `onSaved` w
  `HoursFormSheet`.
- Flagi świadome (0.60): `EXPLICIT_PERMISSIONS` w `permissions.ts` — admin NIE ma
  ich implicite (np. `hours_bulk_add`); `PERMISSION_REQUIRES` = flaga bazowa.
  W panelu osoby admini mają kartę „Funkcje dodatkowe”.
- Push (0.60): stały `PushCard` na Pulpicie zamiast jednorazowego okienka;
  status w Zespole z RPC `push_status` (push_subscriptions ma RLS owner-only).
- Ukryte moduły (0.59.1): Paragony i Prace dodatkowe — `src/lib/featureFlags.ts`
  (`FEATURES.receipts/additionalWorks = false`); kod i dane zostają.
- Rezultat (0.63): `features/results` — RPC `results_year` (0073, tylko admin
  z flagą `results_view`, która jest w `EXPLICIT_PERMISSIONS` i `ADMIN_ONLY_PERMISSIONS`).
  Komentarze = reguły w `story.ts` (klucze `res.*`), bez AI. Przychód w miesiącu
  pracy, nie wpływu; ostrzegać tylko przy fakturze PO terminie.
- Realtime profilu (0074): SessionProvider odświeża profil po zmianie flag/roli,
  więc nowe flagi działają od razu bez restartu.
- Supabase-js: zapytanie rusza dopiero po `.then()`/`await` (pułapka z 0.61.2).
- Godziny (0.61.2): edycja NIE zmienia `created_by` (trigger 0072), kto edytował →
  `updated_by`/`updated_at`; stopka „Dodano / Edytowano” w HoursFormSheet tylko dla
  `hours_edit_all` (0.62).
- Checklista (0.64): odhaczone zadania starsze niż 7 dni są ukryte w `fetchChecklist`
  (filtr `done_at`), w bazie zostają.
- Rezultat — liczenie: przychód w miesiącu PRACY (nie wpływu); ryczałt w toku z planem
  godzin dzielony przez `estimated_hours`, inaczej przez faktyczne godziny (0077);
  dni robocze bez szwedzkich świąt (`workdays()` w `analysis.ts`); admini (Mateusz,
  Tomasz) liczeni w zespole i kosztach — świadomie. Opis miesiąca = 3 akapity
  (ludzie i czas, pieniądze, projekty) w `story.ts`; nieobecności z imieniem (0076).
- Zgody narzędzi: `.claude/settings.json` (Supabase MCP bez pytania) — w repo.
- Kalendarz: `components/ui/RangeCalendar` (nieobecności = zakres; formularz
  godzin = prop `single`). Nowe wybieranie dat robić na nim, nie na natywnym inpucie.
- Oferta publiczna (0078): otwarcie liczone raz na 30 min (`offers.last_viewed_at`),
  bez odświeżania przy powrocie do karty — inaczej push „Klient otworzył ofertę” spamuje.
- Publiczny raport (0079): nieobecności bez notatek (mogą dotyczyć zdrowia — RODO).
- Komunikaty błędów pokazywane użytkownikowi też przez słownik (np. `DuplicateEntryError`
  w godzinach) — 2 z 3 pracowników ma ukraiński.

## Skille projektu (`.claude/skills/`) — używaj zamiast zgadywać

- `bftm-release` — wersja, CHANGELOG, push → PR → merge → deploy → reset brancha.
- `bftm-migration` — wzorce SQL, testy w transakcji z rollbackiem / lokalny Postgres,
  advisory świadomie ignorowane.
- `bftm-ui-preview` — podgląd UI (artefakt Design, tokeny) przed zmianą wyglądu.
- `bftm-browser-check` — test w przeglądarce na podstawionych danych (`smoke.mjs`).
- Hook `.claude/hooks/session-start.sh` instaluje node_modules w nowej sesji w chmurze.
- Repo na GitHubie jest **publiczne** (decyzja Mateusza) — nigdy nie commitować
  sekretów; workflow `deploy-edge-fn.yml` przyjmuje token w polu — nie używać.

## PWA / domena

- Custom domena `app.bftm.se` (CNAME → hiowcaheh.github.io, DNS w Miss Hosting).
  `vite.config.ts`: base '/', manifest scope '/' — NIE wracać do '/bftm/'.
- Ikony: `public/icons/*` + `public/apple-touch-icon.png` (kopia w rootcie dla iOS).
  Źródło: przycięty glossy-3D PNG od użytkownika — nie generować wektorowych liter.
- SW update: prompt w Ustawieniach + toast (UpdatePrompt). PDF-y: pdfmake (lazy,
  osobny chunk), podgląd przez pdfjs-dist z `?worker`.

## Design (nie zmieniać bez prośby)

- iOS-first, minimalizm; karty na `--color-surface`, tło `html` + watermark
  z małych logo (AppLayout, -z-10, opacity 0.03, rotate -24deg) widoczny tylko
  w pustych miejscach.
- Toasty: `toast.success/error/info` z `components/ui/Toast`.
- Akcje destrukcyjne: zawsze `ConfirmDialog`.
- Komentarze w kodzie po polsku, zwięzłe, tłumaczą „dlaczego".

## Proces pracy z użytkownikiem

- Mateusz pisze po polsku, iteruje szybko, testuje na iPhonie po każdym deployu.
- **Przed każdą zmianą wyglądu (UI) najpierw pokaż podgląd** — artefakt HTML
  odwzorowujący aplikację (tokeny z `index.css`, układ iOS), często 2–3 warianty.
  Kod zmieniamy dopiero po akceptacji („ok wprowadź"). Zmiany czysto logiczne
  / poprawki błędów — bez podglądu.
- Rób dokładnie to, o co prosi — bez dodatkowych zmian „przy okazji".
- **Stała zgoda (od 0.58.2):** po akceptacji funkcji/podglądu nie pytaj ponownie
  o pozwolenie na kroki wykonawcze — commit, PR, merge, deploy, migracje
  przyrostowe, zapytania do bazy. Nadal pytaj przed: zmianą wyglądu bez podglądu,
  trwałym kasowaniem danych w bazie/storage i wszystkim, czego nie da się cofnąć.
- **Przed pushem (od 0.66):** podsumowanie zmian w czacie (co, dlaczego, jak
  sprawdzone, migracje) i czekanie na zgodę Mateusza; migracje na produkcję też
  dopiero po zgodzie. Do tego czasu tylko lokalne commity.
- Wersjonowanie: minor przy nowej funkcji, patch przy poprawce; CHANGELOG po polsku.
- Nie łączyć wielu funkcji w jeden commit — małe, opisowe commity.
