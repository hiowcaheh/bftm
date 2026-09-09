-- 0066 — project_stats: łączną sumę godzin projektu widzą też pracownicy,
-- ale TYLKO gdy projekt ma budżet godzin (estimated_hours > 0) — wtedy suma
-- + pasek postępu mają sens. Bez budżetu sumę widzi tylko admin/hours_view_all.
-- Podział „kto ile" nadal wyłącznie dla uprawnionych (w UI).

create or replace function public.project_stats()
returns table(project_id uuid, total_hours numeric, workers jsonb, client_name text, client_type text)
language sql
security definer
set search_path to 'public'
as $function$
  select p.id as project_id,
         case when public.is_admin()
                or public.has_perm('hours_view_all')
                or coalesce(p.estimated_hours, 0) > 0
              then coalesce(sum(wh.hours), 0)::numeric
              else 0::numeric
         end as total_hours,
         coalesce(
           jsonb_agg(distinct jsonb_build_object('name', pr.full_name, 'avatar_path', pr.avatar_path))
             filter (where wh.date = (now() at time zone 'Europe/Stockholm')::date and pr.full_name is not null),
           '[]'::jsonb
         ) as workers,
         c.name as client_name,
         c.type::text as client_type
  from public.projects p
  left join public.work_hours wh on wh.project_id = p.id
  left join public.profiles pr on pr.id = wh.employee_id
  left join public.clients c on c.id = p.client_id
  group by p.id, c.name, c.type;
$function$;
