-- A) project_stats: dołożone client_name + client_type — pracownik bez
-- clients_view i tak zobaczy nazwę i typ klienta (i ikonę dom/budynek).
-- Funkcja security definer zwraca TYLKO nazwę i typ (nie e-mail/telefon/notatki).
-- LEFT JOIN od projektów obejmuje też projekty bez godzin.
drop function if exists public.project_stats();

create or replace function public.project_stats()
returns table (
  project_id uuid,
  total_hours numeric,
  workers jsonb,
  client_name text,
  client_type text
)
language sql
security definer
set search_path = public
as $$
  select p.id as project_id,
         coalesce(sum(wh.hours), 0)::numeric as total_hours,
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
$$;

revoke all on function public.project_stats() from public;
grant execute on function public.project_stats() to authenticated;

-- B) report_absences: dni nieobecności per pracownik i typ w zakresie dat
-- (Semester/VAB/Sjuk itd.). Dostęp tylko admin/reports_view.
create or replace function public.report_absences(p_from date, p_to date)
returns table (employee_id uuid, name text, type text, days int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (is_admin() or has_perm('reports_view')) then
    raise exception 'Brak uprawnień do raportu';
  end if;
  return query
    select a.employee_id,
           pr.full_name,
           a.type::text,
           sum(greatest(0, (least(a.date_to, p_to) - greatest(a.date_from, p_from) + 1)))::int as days
    from public.absences a
    join public.profiles pr on pr.id = a.employee_id
    where a.date_from <= p_to and a.date_to >= p_from
    group by a.employee_id, pr.full_name, a.type
    having sum(greatest(0, (least(a.date_to, p_to) - greatest(a.date_from, p_from) + 1))) > 0;
end;
$$;

revoke all on function public.report_absences(date, date) from public;
grant execute on function public.report_absences(date, date) to authenticated;
