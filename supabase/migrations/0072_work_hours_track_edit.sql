-- 0072 — trigger BEFORE UPDATE na work_hours:
--  • created_by zostaje oryginalny (wcześniej formularz nadpisywał go edytującym),
--  • updated_by/updated_at ustawiane tylko przy zmianie treści (godziny, data,
--    projekt, aktywność, opis, pracownik) — zatwierdzanie/fakturowanie (status) nie.
create or replace function public.work_hours_track_edit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.created_by := old.created_by;
  if auth.uid() is not null and (
       new.hours is distinct from old.hours
    or new.date is distinct from old.date
    or new.project_id is distinct from old.project_id
    or new.activity_id is distinct from old.activity_id
    or new.description is distinct from old.description
    or new.employee_id is distinct from old.employee_id
  ) then
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.work_hours_track_edit() from public, anon, authenticated;
create trigger work_hours_track_edit
  before update on public.work_hours
  for each row execute function public.work_hours_track_edit();
