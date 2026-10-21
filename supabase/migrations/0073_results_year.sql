-- 0073 — Rezultat: roczne dane do zakładki „Rezultat" (jedno wywołanie = cały rok).
-- Tylko admin z flagą results_view (nadawaną świadomie, admin NIE ma jej implicite).
-- Przychód = godziny × stawka (hourly/mixed) + ryczałt rozłożony wg udziału godzin
-- projektu w danym miesiącu; koszt = jak w finance_daily (wage × mnożnik).
create or replace function public.results_year(p_year int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date := make_date(p_year, 1, 1);
  v_to date := make_date(p_year, 12, 31);
  v_mult numeric := public.finance_cost_multiplier();
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
      and coalesce((p.permissions ->> 'results_view')::boolean, false)
  ) then
    raise exception 'Brak uprawnień do zakładki Rezultat';
  end if;

  return (
    with wh as (
      select w.date, extract(month from w.date)::int as m, w.hours, w.employee_id, w.project_id,
        w.hours * public.employee_wage_at(w.employee_id, w.date) * v_mult as cost,
        case when p.billing_type in ('hourly', 'mixed') then w.hours * coalesce(p.hourly_rate, 0) else 0 end
        + case when p.billing_type in ('fixed', 'mixed') and coalesce(p.fixed_value, 0) > 0 and t.total > 0
            then p.fixed_value * w.hours / t.total else 0 end as rev
      from public.work_hours w
      join public.projects p on p.id = w.project_id
      join lateral (select sum(x.hours) as total from public.work_hours x where x.project_id = w.project_id) t on true
      where w.date between v_from and v_to
    ),
    firsts as (
      select project_id, min(date) as first_day from public.work_hours group by project_id
    )
    select jsonb_build_object(
      'year', p_year,
      'firstDay', (select min(date) from public.work_hours),
      'months', coalesce((
        select jsonb_agg(jsonb_build_object(
          'm', m, 'hours', hours, 'people', people, 'projects', projects, 'workDays', work_days,
          'personDays', person_days, 'weekendDays', weekend_days, 'weekendHours', weekend_hours,
          'revenue', round(rev, 2), 'labor', round(cost, 2),
          'newProjects', (select count(*) from firsts f
                          where f.first_day between v_from and v_to and extract(month from f.first_day) = mm.m),
          'expenses', coalesce((select sum(e.amount_gross) from public.expenses e
                                where e.date between v_from and v_to and extract(month from e.date) = mm.m), 0)
        ) order by m)
        from (
          select m, sum(hours) as hours, count(distinct employee_id) as people,
            count(distinct project_id) as projects, count(distinct date) as work_days,
            count(distinct (employee_id, date)) as person_days,
            count(distinct date) filter (where extract(isodow from date) >= 6) as weekend_days,
            coalesce(sum(hours) filter (where extract(isodow from date) >= 6), 0) as weekend_hours,
            sum(rev) as rev, sum(cost) as cost
          from wh group by m
        ) mm
      ), '[]'::jsonb),
      'projects', coalesce((
        select jsonb_agg(jsonb_build_object(
          'm', x.m, 'id', p.id, 'name', p.name, 'color', p.color,
          'clientId', c.id, 'client', c.name,
          'hours', x.hours, 'revenue', round(x.rev, 2), 'cost', round(x.cost, 2)
        ))
        from (select m, project_id, sum(hours) as hours, sum(rev) as rev, sum(cost) as cost
              from wh group by m, project_id) x
        join public.projects p on p.id = x.project_id
        left join public.clients c on c.id = p.client_id
      ), '[]'::jsonb),
      'team', coalesce((
        select jsonb_agg(jsonb_build_object(
          'm', x.m, 'id', pr.id, 'name', pr.full_name, 'avatar', pr.avatar_path,
          'hours', x.hours, 'days', x.days
        ))
        from (select m, employee_id, sum(hours) as hours, count(distinct date) as days
              from wh group by m, employee_id) x
        join public.profiles pr on pr.id = x.employee_id
      ), '[]'::jsonb),
      'invoices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'amount', i.amount, 'sent', i.sent_at, 'due', i.due_at, 'paid', i.paid_at,
          'clientId', p.client_id
        ))
        from public.project_invoices i
        join public.projects p on p.id = i.project_id
        where i.sent_at between v_from and v_to or i.paid_at between v_from and v_to
      ), '[]'::jsonb),
      'clientPayDays', coalesce((
        select jsonb_object_agg(cid, days) from (
          select p.client_id as cid, round(avg(i.paid_at - i.sent_at)) as days
          from public.project_invoices i join public.projects p on p.id = i.project_id
          where i.paid_at is not null and p.client_id is not null
          group by p.client_id
        ) s
      ), '{}'::jsonb),
      'absences', coalesce((
        select jsonb_agg(jsonb_build_object('m', m, 'type', type, 'days', days))
        from (
          select extract(month from d)::int as m, a.type, count(*) as days
          from public.absences a
          cross join lateral generate_series(greatest(a.date_from, v_from), least(a.date_to, v_to), interval '1 day') d
          where a.date_to >= v_from and a.date_from <= v_to and extract(isodow from d) < 6
          group by 1, 2
        ) s
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.results_year(int) from public, anon;
grant execute on function public.results_year(int) to authenticated;
