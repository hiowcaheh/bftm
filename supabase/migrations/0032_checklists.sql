-- 0032 — Check-lista: firmowa (wspólna, główna) + prywatna (per pracownik).
-- Firmową widzą i edytują wszyscy aktywni; prywatną tylko właściciel,
-- a tworzyć ją mogą tylko posiadacze flagi 'checklist_private' (lub admin).
-- Realtime: zmiany rozgłaszane do wszystkich klientów (dodanie/status/usunięcie).

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('company', 'private')),
  owner_id uuid references public.profiles (id) on delete cascade,   -- tylko private
  project_id uuid references public.projects (id) on delete set null, -- tylko company
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  text text not null check (length(btrim(text)) > 0),
  done boolean not null default false,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index checklist_company_idx on public.checklist_items (scope, done, created_at desc);
create index checklist_owner_idx on public.checklist_items (owner_id) where scope = 'private';

alter table public.checklist_items enable row level security;

-- Odczyt: firmową widzą wszyscy aktywni; prywatną tylko właściciel
create policy checklist_select on public.checklist_items
  for select to authenticated
  using (
    (scope = 'company' and public.is_active())
    or (scope = 'private' and owner_id = auth.uid())
  );

-- Dodawanie: firmowa — każdy aktywny; prywatna — właściciel z flagą (lub admin)
create policy checklist_insert on public.checklist_items
  for insert to authenticated
  with check (
    public.is_active()
    and created_by = auth.uid()
    and (
      scope = 'company'
      or (
        scope = 'private'
        and owner_id = auth.uid()
        and (public.is_admin() or public.has_perm('checklist_private'))
      )
    )
  );

-- Zmiana statusu / edycja: firmowa — każdy aktywny; prywatna — właściciel
create policy checklist_update on public.checklist_items
  for update to authenticated
  using (
    (scope = 'company' and public.is_active())
    or (scope = 'private' and owner_id = auth.uid())
  )
  with check (
    (scope = 'company' and public.is_active())
    or (scope = 'private' and owner_id = auth.uid())
  );

-- Usuwanie: firmowa — każdy aktywny; prywatna — właściciel
create policy checklist_delete on public.checklist_items
  for delete to authenticated
  using (
    (scope = 'company' and public.is_active())
    or (scope = 'private' and owner_id = auth.uid())
  );

-- Realtime (dodanie/edycja/usunięcie na żywo u wszystkich)
alter table public.checklist_items replica identity full;
alter publication supabase_realtime add table public.checklist_items;
