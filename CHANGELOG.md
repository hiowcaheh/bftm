# Changelog

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
