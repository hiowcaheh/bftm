-- 0081 — porządki w uprawnieniach funkcji (advisor Supabase).
-- 1) anon (bez logowania) nie może wołać funkcji finansowej ani funkcji triggerów.
--    Nic przez nie nie wyciekało (finance_month_balance sprawdza flagę, triggerów
--    nie da się wywołać jako RPC), ale nie powinny być publicznym API.
revoke execute on function public.finance_month_balance() from public, anon;
revoke execute on function public.notify_absence_created() from public, anon, authenticated;
revoke execute on function public.notify_offer_viewed() from public, anon, authenticated;

-- 2) project_stats / project_last_hours zwracały wszystkie projekty (z klientem
--    i dzisiejszą ekipą) każdemu zalogowanemu. Wołają je tylko ekrany projektów,
--    więc wymagamy podglądu/edycji projektów — jak RLS tabeli projects.
create or replace function public.project_stats()
returns table(project_id uuid, total_hours numeric, workers jsonb, client_name text, client_type text)
language sql
security definer
set search_path = public
as $$
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
  where (select public.is_admin() or public.has_perm('projects_view') or public.has_perm('projects_edit'))
  group by p.id, c.name, c.type;
$$;

create or replace function public.project_last_hours()
returns table(project_id uuid, last_date date)
language sql
stable
security definer
set search_path = public
as $$
  select wh.project_id, max(wh.date)
  from public.work_hours wh
  where (select public.is_admin() or public.has_perm('projects_view') or public.has_perm('projects_edit'))
  group by wh.project_id;
$$;
