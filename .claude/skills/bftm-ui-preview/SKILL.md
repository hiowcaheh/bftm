---
name: bftm-ui-preview
description: Use before any visual change in the BFTM app — new screen, button, dialog, layout, colors, text placement — because Mateusz must approve a preview before UI code changes ("ok wprowadź").
---

# Podgląd UI dla Mateusza (przed kodem)

## Zasada
Zmiana wyglądu = najpierw podgląd, kod dopiero po „ok wprowadź”. Zmiany czysto logiczne i poprawki błędów — bez podglądu.

## Jak zrobić podgląd
1. `Artifact` → `action: quickstart`, `intent: design` → utwórz canvas z typu Design (tytuł po polsku, np. „BFTM — Archiwum pracowników (podgląd)”).
2. Każdy ekran = artboard 390×844 (iPhone). 2–3 warianty obok siebie, gdy jest wybór (podpisz „Wariant A/B”).
3. Odwzoruj aplikację tokenami z `src/styles/index.css`:

| Token | Wartość |
|---|---|
| tło `bg` | `#f2f2f5` |
| karta | `#ffffff`, radius 16px, cień `0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)` |
| `surface` (przyciski secondary, pola) | `#e9e9ee` |
| tekst / drugorzędny | `#1a1a1a` / `#666666` |
| akcent | `#cc0000` (soft `#fdecec`) |
| linie | `#e5e5e5` |
| success / error / warning / info | `#2e7d32` / `#c62828` / `#e65100` / `#1565c0` |
| font | `system-ui, -apple-system` — 13/15/17/20/24 px |

   Układ: nagłówek (tytuł 20px po lewej, logo BFTM pośrodku, dzwonek), karty `ListGroup` z wierszami 56–64 px (avatar 40px, tytuł 15px, podtytuł 13px, chevron), przyciski 48px radius 10px, dolna nawigacja (Pulpit, Projekty, Godziny, Oferty, Więcej), FAB 56px czerwony.
4. Teksty po polsku jak w aplikacji, prawdziwe nazwy ekranów — bez lorem ipsum.
5. W odpowiedzi: link + pytania do decyzji w punktach (np. „A czy B?”). Czekaj.

## Po akceptacji
- Kod: komponenty z `src/components/ui` (Card, ListGroup/ListRow, Button, Badge, ConfirmDialog, EmptyState) — nie nowe style.
- Każdy string przez słownik i18n w 4 językach.
- Sprawdź zrzutami: skill `bftm-browser-check`; porównaj z podglądem.

## Nie zmieniać bez prośby
Watermark z logo w tle, blokujące okno aktualizacji (`UpdatePrompt`), animacje z `index.css`, zielona karta sukcesu na Pulpicie.
