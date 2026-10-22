---
name: bftm-release
description: Use when shipping any BFTM change to production (app.bftm.se) — version bump, CHANGELOG, push, PR to main, merge, deploy check — or when Mateusz says "wdrażaj", "wypchnij", "ok wprowadź" after reviewing changes.
---

# Wydanie BFTM na produkcję

## Zasada
Przed pushem pokaż Mateuszowi w czacie podsumowanie zmian (co, dlaczego, jak sprawdzone, migracje) i poczekaj na zgodę. Bez zgody: tylko lokalne commity.

## Przed pushem (wszystko musi przejść)
```bash
npx tsc -b --noEmit          # 0 błędów
npm run lint                 # 0 błędów (warningi fast-refresh są znane)
npm run build                # MUSI przejść
```
- i18n: każdy nowy string w `src/lib/i18n/dict.ts` w pl/sv/en/uk (polski = źródło).
- UI: sprawdzony w przeglądarce — skill `bftm-browser-check`.
- Migracje: przetestowane (skill `bftm-migration`), zastosowane `apply_migration` DOPIERO po zgodzie, kopia w `supabase/migrations/`.

## Wersja i CHANGELOG
- `APP_VERSION` w `src/features/settings/pages/SettingsPage.tsx`: minor = nowa funkcja, patch = poprawka.
- Wpis na górze `CHANGELOG.md` po polsku: `## X.Y.Z — tytuł (RRRR-MM-DD)` + punkty językiem użytkownika.
- Osobny commit „Wersja X.Y.Z + CHANGELOG”. Małe, opisowe commity — jedna zmiana = jeden commit.

## Push → PR → merge
1. `git push -u origin claude/construction-pwa-sweden-wa6yqd`
2. PR do `main` przez `mcp__github__create_pull_request` (owner `hiowcaheh`, repo `bftm`).
3. Merge: `mcp__github__merge_pull_request`, `merge_method: rebase`, `expectedHeadSha` = pełne 40 znaków (`git rev-parse HEAD`).
4. Deploy: `mcp__github__actions_list` → `list_workflow_runs`, `resource_id: deploy.yml` — czekaj na `conclusion: success`.
5. Weryfikacja: `git fetch origin gh-pages && git log origin/gh-pages -1` — commit „deploy: <sha z main>”.
6. Reset brancha na świeży main:
   ```bash
   git fetch origin main && git checkout -B claude/construction-pwa-sweden-wa6yqd origin/main
   git push --force-with-lease -u origin claude/construction-pwa-sweden-wa6yqd
   ```

## Typowe problemy
| Objaw | Co zrobić |
|---|---|
| Pages wisi na „updating_pages” | ponowny deploy (workflow_dispatch deploy.yml) — patrz 0.45.2–0.45.4 w CHANGELOG |
| `expectedHeadSha` odrzucony | podaj pełny SHA, nie skrót |
| iPhone nie widzi nowej wersji | blokujące okno aktualizacji (`UpdatePrompt`) pokaże się po wejściu do apki |
