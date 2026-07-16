-- 0030 — Specyfikacje faktury (faktura underlag): zapisana lista dokumentów
-- (klient + projekt + okres + tytuł), a pozycje liczone NA ŻYWO z godzin.
-- Dostęp: admin lub flaga 'invoices_manage'. PDF generowany po stronie klienta.

create table public.invoice_specs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid not null references public.projects (id) on delete cascade,
  period_from date not null,
  period_to date not null check (period_to >= period_from),
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invoice_specs_project_idx on public.invoice_specs (project_id);
create index invoice_specs_created_idx on public.invoice_specs (created_at desc);

alter table public.invoice_specs enable row level security;

-- Widzi i zarządza wyłącznie admin lub osoba z flagą 'invoices_manage'
create policy invoice_specs_all on public.invoice_specs
  for all to authenticated
  using (public.is_admin() or public.has_perm('invoices_manage'))
  with check (public.is_admin() or public.has_perm('invoices_manage'));

-- Pozycje specyfikacji NA ŻYWO: data, pracownik, aktywność (ÄTA Namn),
-- godziny, opis (Anteckning) dla danego projektu w okresie.
create or replace function public.invoice_spec_items(
  p_project uuid,
  p_from date,
  p_to date
)
returns table (
  entry_date date,
  employee_name text,
  activity_name text,
  hours numeric,
  note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.has_perm('invoices_manage')) then
    raise exception 'Brak uprawnień do specyfikacji faktury';
  end if;

  return query
  select
    w.date as entry_date,
    pr.full_name as employee_name,
    a.name as activity_name,
    w.hours as hours,
    w.description as note
  from public.work_hours w
  join public.profiles pr on pr.id = w.employee_id
  left join public.project_activities a on a.id = w.activity_id
  where w.project_id = p_project
    and w.date between p_from and p_to
  order by w.date asc, pr.full_name asc, a.name asc nulls first;
end;
$$;

revoke execute on function public.invoice_spec_items(uuid, date, date) from public, anon;
grant execute on function public.invoice_spec_items(uuid, date, date) to authenticated;
