-- Agregat per projekt: suma godzin + lista osób (bez stawek/finansów),
-- do kart na liście projektów (postęp godzin + awatary pracowników).
-- security definer, żeby suma była pełna niezależnie od RLS na work_hours;
-- zwracane dane są nie-wrażliwe (godziny i imiona widoczne też w zespole).
create or replace function public.project_stats()
returns table (project_id uuid, total_hours numeric, workers text[])
language sql
security definer
set search_path = public
as $$
  select wh.project_id,
         coalesce(sum(wh.hours), 0)::numeric as total_hours,
         coalesce(
           array_agg(distinct pr.full_name) filter (where pr.full_name is not null),
           '{}'
         ) as workers
  from public.work_hours wh
  join public.profiles pr on pr.id = wh.employee_id
  group by wh.project_id;
$$;

revoke all on function public.project_stats() from public;
grant execute on function public.project_stats() to authenticated;
