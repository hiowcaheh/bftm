-- 0084 — Numer projektu (np. P2612, od 2027 P2701…).
-- Mateusz wpisuje go sam w formularzu projektu (aplikacja podpowiada kolejny po
-- najwyższym), numer pokazuje się na karcie projektu i służy do szukania
-- (lista projektów, wybór projektu w specyfikacji faktury). Pole opcjonalne —
-- projekt bez numeru wygląda jak dotąd. Ten sam numer nie może być w dwóch
-- projektach (bez względu na wielkość liter i spacje na brzegach).
-- projects czyta każde zapytanie (RLS, karty) — nie czekamy w kolejce na blokadę
set local lock_timeout = '5s';

alter table public.projects add column if not exists number text;

alter table public.projects
  add constraint projects_number_not_blank check (number is null or btrim(number) <> '');

create unique index if not exists projects_number_unique
  on public.projects (upper(btrim(number)))
  where number is not null;
