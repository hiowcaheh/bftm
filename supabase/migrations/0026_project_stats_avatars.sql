-- project_stats: workers jako jsonb [{name, avatar_path}], żeby na karcie
-- projektu pokazać prawdziwe miniatury (zdjęcia) pracowników, nie tylko inicjały.
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
             filter (where pr.full_name is not null),
           '[]'::jsonb
         ) as workers
  from public.work_hours wh
  join public.profiles pr on pr.id = wh.employee_id
  group by wh.project_id;
$$;

revoke all on function public.project_stats() from public;
grant execute on function public.project_stats() to authenticated;
