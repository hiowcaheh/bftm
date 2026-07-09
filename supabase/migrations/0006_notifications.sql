-- 0006 — system powiadomień w aplikacji (dzwoneczek).
-- Pierwsze źródło: zatwierdzenie godzin przez admina; kolejne typy dojdą później.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx
  on public.notifications (recipient_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- odbiorca czyta swoje
create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

-- odbiorca oznacza swoje jako przeczytane / usuwa
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (recipient_id = auth.uid() or public.is_admin());

-- tworzy admin lub zatwierdzający godziny
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('hours_approve'));
