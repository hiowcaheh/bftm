---
name: bftm-browser-check
description: Use when verifying a BFTM frontend change in a real browser before pushing — screens render, no JS errors, flows work — without logging in to production or touching real data; also for screenshots of app screens.
---

# Sprawdzenie BFTM w przeglądarce (bez produkcji)

## Idea
Playwright + Chromium z kontenera. Zapytania do `*.supabase.co` są przechwytywane, a sesję udaje podstawiony admin w localStorage. Żadne żądanie nie trafia do prawdziwej bazy.

## Szybki test dymny wszystkich modułów
```bash
npm run build
npx vite preview --port 4173 --strictPort &      # w tle
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node .claude/skills/bftm-browser-check/smoke.mjs <scratchpad>/shots
# albo wybrane trasy:  ... smoke.mjs <katalog> /pracownicy /pracownicy/archiwum
```
Wynik: tytuł ekranu, `ok` albo `BŁĄD EKRANU` („Coś poszło nie tak” z ErrorBoundary), zrzut PNG (obejrzyj go narzędziem Read), lista błędów JS. Kod wyjścia 1 = coś nie gra.

## Test konkretnego przepływu
Skopiuj `smoke.mjs` do scratchpada i dopisz:
- dane w `DATA` (klucz = nazwa tabeli REST, np. `projects`, `work_hours`),
- obsługę RPC w `page.route` (np. zmiana stanu po `admin_archive_employee`),
- kroki: `page.getByText('…').click()`, `page.getByRole('alertdialog')`, sprawdzanie toastów przez `document.body.innerText`.

## Pułapki
| Problem | Rozwiązanie |
|---|---|
| `/rezultat` przekierowuje na Pulpit | flaga `results_view` jest jawna (EXPLICIT_PERMISSIONS) — dodaj ją adminowi w `DATA.profiles` |
| język | `localStorage['bftm-lang']` = `pl` / `sv` / `en` / `uk` |
| `maybeSingle()` | odpowiedź obiektem, gdy nagłówek Accept zawiera `vnd.pgrst.object` (obsłużone) |
| `playwright install` | NIE uruchamiaj — przeglądarki są w `/opt/pw-browsers` |
