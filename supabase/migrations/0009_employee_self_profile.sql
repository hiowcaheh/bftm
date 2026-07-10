-- 0009 — Mój profil: pracownik widzi i uzupełnia własne dane osobiste
-- (personnummer + rozmiary odzieży). Cudze wpisy nadal widzi tylko admin.

alter table public.employee_private
  add column shirt_size text,
  add column pants_size text,
  add column shoe_size text;

create policy employee_private_self_select on public.employee_private
  for select to authenticated
  using (profile_id = auth.uid());

create policy employee_private_self_insert on public.employee_private
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy employee_private_self_update on public.employee_private
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
