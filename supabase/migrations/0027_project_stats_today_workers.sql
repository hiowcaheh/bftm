-- project_stats.workers = osoby, które pracowały DZIŚ na projekcie
-- (strefa Europe/Stockholm), do awatarów „dziś na budowie" na karcie.
-- total_hours pozostaje sumą wszystkich godzin (pasek postępu).
drop function if exists public.project_stats();

create or replace function public.project_stats()
returns table (project_id uuid, total_hours numeric, workers jsonb)
language sql
security definer
set search_path = public
as $$
  select wh.project_id,
         coalesce(sum(wh.hours), 0)::numeric as total_hours,
         coalesce(
           jsonb_agg(distinct jsonb_build_object('name', pr.full_name, 'avatar_path', pr.avatar_path))
             filter (where wh.date = (now() at time zone 'Europe/Stockholm')::date),
           '[]'::jsonb
         ) as workers
  from public.work_hours wh
  join public.profiles pr on pr.id = wh.employee_id
  group by wh.project_id;
$$;

revoke all on function public.project_stats() from public;
grant execute on function public.project_stats() to authenticated;
