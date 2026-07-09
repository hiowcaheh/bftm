-- 0005 — aktywności (usługi/etapy) projektów + powiązanie z wpisami godzin.
-- Pracownik przy dodawaniu godzin wybiera projekt, a potem aktywność
-- (jeśli projekt jakieś ma). Admin widzi na projekcie kto co robił i ile.

create table public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index project_activities_project_idx
  on public.project_activities (project_id, position);

alter table public.project_activities enable row level security;

create policy project_activities_select on public.project_activities
  for select to authenticated
  using (public.is_admin() or public.has_perm('projects_view') or public.has_perm('hours_add_own'));
create policy project_activities_write on public.project_activities
  for all to authenticated
  using (public.is_admin() or public.has_perm('projects_edit'))
  with check (public.is_admin() or public.has_perm('projects_edit'));

alter table public.work_hours
  add column activity_id uuid references public.project_activities (id) on delete set null;
create index work_hours_activity_idx on public.work_hours (activity_id);

-- Unikalność wpisu dnia rozszerzona o aktywność: jeden wpis na
-- pracownika+projekt+dzień+aktywność (brak aktywności = jeden wpis „ogólny").
drop index public.work_hours_one_per_day;
create unique index work_hours_one_per_day
  on public.work_hours (
    employee_id, project_id, date,
    coalesce(activity_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
