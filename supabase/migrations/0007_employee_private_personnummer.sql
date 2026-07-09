-- 0007 — personnummer pracownika (dane wrażliwe, dostęp wyłącznie admin)
-- + admin_create_employee z parametrem p_personnummer (stara sygnatura usunięta).
-- Pełna treść wykonana na projekcie BFTM przez MCP apply_migration
-- (migracje: employee_private_personnummer, drop_old_create_employee_signature).

create table public.employee_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  personnummer text,
  updated_at timestamptz not null default now()
);

alter table public.employee_private enable row level security;

create policy employee_private_admin on public.employee_private
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- admin_create_employee: nowa sygnatura z p_personnummer text default null,
-- wstawia employee_private przy podanym numerze; stara 7-arg wersja usunięta.
-- (pełne ciało funkcji jak w 0003 + insert do employee_private)
