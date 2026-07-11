-- Serwerowy schowek na klucze usług zewnętrznych (Resend itd.).
-- Czytany WYŁĄCZNIE przez Edge Functions przez service_role; RLS + odebrane
-- grn­ty blokują dostęp dla klientów (anon/authenticated). Sama wartość klucza
-- NIE trafia do repozytorium — wstawiana osobnym poleceniem SQL na produkcji.
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

-- Brak polityk = brak dostępu dla anon/authenticated (service_role omija RLS).
-- Dodatkowo odbieramy grn­ty tabelowe — obrona w głąb.
revoke all on public.app_secrets from anon, authenticated;
