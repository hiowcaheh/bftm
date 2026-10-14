-- 0069 — data ostatniego wpisu godzin per projekt (podpowiedź „Brak godzin od N dni").
create or replace function public.project_last_hours()
returns table(project_id uuid, last_date date)
language sql
stable
security definer
set search_path to 'public'
as $$
  select wh.project_id, max(wh.date) from public.work_hours wh group by wh.project_id;
$$;
revoke execute on function public.project_last_hours() from public, anon;
grant execute on function public.project_last_hours() to authenticated;
