-- 0083 — Ryczałt liczony tak samo na Pulpicie, w Finansach i w Rezultacie.
-- Mateusz widział dwa różne zyski października: Pulpit +59 548 kr, Rezultat
-- +87 948 kr. Pulpit (finance_month_balance) i Finanse (finance_daily) liczyły
-- przychód tylko z godzin × stawka, więc projekty na ryczałt miały przychód 0,
-- a koszt pracy przy nich i tak się odejmował. Wzór z Rezultatu (0077) trafia
-- do jednej funkcji hours_revenue i korzystają z niej wszystkie trzy miejsca.

-- Przychód z danych godzin projektu: stawka × godziny (hourly/mixed) + część
-- ryczałtu (fixed/mixed) proporcjonalna do godzin. Ryczałt dzielony przez plan
-- godzin, gdy projekt trwa i plan jest większy niż przepracowane godziny,
-- inaczej przez wszystkie przepracowane godziny projektu.
create or replace function public.hours_revenue(p_project_id uuid, p_hours numeric)
returns numeric
language sql
stable
set search_path = public
as $$
  select
    case when p.billing_type in ('hourly', 'mixed') then p_hours * coalesce(p.hourly_rate, 0) else 0 end
    + case when p.billing_type in ('fixed', 'mixed') and coalesce(p.fixed_value, 0) > 0 and t.total > 0
        then p.fixed_value * p_hours / (
          case when p.status <> 'completed' and coalesce(p.estimated_hours, 0) > t.total
            then p.estimated_hours else t.total end
        ) else 0 end
  from public.projects p
  cross join lateral (
    select sum(x.hours) as total from public.work_hours x where x.project_id = p.id
  ) t
  where p.id = p_project_id
$$;
-- tylko do użytku wewnątrz funkcji finansowych (security definer) — nie z API
revoke execute on function public.hours_revenue(uuid, numeric) from public, anon, authenticated;

create or replace function public.finance_daily(p_from date, p_to date)
returns table(day date, hours numeric, labor_cost numeric, revenue numeric, expenses numeric)
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_mult numeric := public.finance_cost_multiplier();
begin
  if not (public.is_admin() or public.has_perm('finance_view')) then
    raise exception 'Brak uprawnień do danych finansowych';
  end if;

  return query
  select
    d.day::date,
    coalesce(h.hours, 0),
    coalesce(h.cost, 0),
    coalesce(h.revenue, 0),
    coalesce(e.total, 0)
  from generate_series(p_from, p_to, interval '1 day') d(day)
  left join (
    select
      wh.date,
      sum(wh.hours) as hours,
      round(sum(wh.hours * public.employee_wage_at(wh.employee_id, wh.date) * v_mult), 2) as cost,
      sum(public.hours_revenue(wh.project_id, wh.hours)) as revenue
    from public.work_hours wh
    join public.projects p on p.id = wh.project_id
    where wh.date between p_from and p_to
    group by wh.date
  ) h on h.date = d.day::date
  left join (
    select ex.date, sum(ex.amount_gross) as total
    from public.expenses ex
    where ex.date between p_from and p_to
    group by ex.date
  ) e on e.date = d.day::date
  order by 1;
end;
$$;

create or replace function public.finance_month_balance()
returns table(revenue_hours numeric, labor_cost numeric, expenses numeric, awaiting_invoiced numeric, awaiting_fixed numeric)
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_mult numeric := public.finance_cost_multiplier();
  v_from date := date_trunc('month', now() at time zone 'Europe/Stockholm')::date;
  v_to date := (date_trunc('month', now() at time zone 'Europe/Stockholm') + interval '1 month - 1 day')::date;
begin
  if not (public.is_admin() or public.has_perm('finance_view')) then
    raise exception 'Brak uprawnień do danych finansowych';
  end if;

  return query
  select
    -- przychód miesiąca: godziny × stawka + część ryczałtów (jak w Rezultacie)
    coalesce((
      select sum(public.hours_revenue(wh.project_id, wh.hours))
      from work_hours wh
      where wh.date between v_from and v_to
    ), 0),
    coalesce((
      select round(sum(wh.hours * public.employee_wage_at(wh.employee_id, wh.date) * v_mult), 2)
      from work_hours wh
      where wh.date between v_from and v_to
    ), 0),
    coalesce((
      select sum(e.amount_gross) from expenses e where e.date between v_from and v_to
    ), 0),
    -- wystawione, nieopłacone faktury (wszystkie projekty, bez limitu czasu)
    coalesce((
      select sum(pi.amount) from project_invoices pi where pi.paid_at is null
    ), 0),
    -- aktywne fastpris/mixed: część umówionej kwoty jeszcze niezafakturowana
    coalesce((
      select sum(greatest(coalesce(p.fixed_value, 0) - coalesce(inv.total, 0), 0))
      from projects p
      left join (
        select pi.project_id, sum(pi.amount) as total
        from project_invoices pi group by pi.project_id
      ) inv on inv.project_id = p.id
      where p.status = 'active' and p.billing_type in ('fixed', 'mixed')
    ), 0);
end;
$$;

-- Rezultat korzysta z tej samej funkcji (wynik bez zmian — ten sam wzór co w 0077)
create or replace function public.results_year(p_year integer)
returns jsonb
language plpgsql
stable security definer
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
        public.hours_revenue(w.project_id, w.hours) as rev
      from public.work_hours w
      join public.projects p on p.id = w.project_id
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
          'm', x.m, 'id', p.id, 'name', p.name, 'color', p.color, 'status', p.status,
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
        select jsonb_agg(jsonb_build_object(
          'm', m, 'type', type, 'days', days, 'name', name, 'from', d_from, 'to', d_to
        ))
        from (
          select extract(month from d)::int as m, a.type,
            count(*) filter (where extract(isodow from d) < 6) as days,
            split_part(pr.full_name, ' ', 1) as name,
            min(d)::date as d_from, max(d)::date as d_to
          from public.absences a
          join public.profiles pr on pr.id = a.employee_id
          cross join lateral generate_series(greatest(a.date_from, v_from), least(a.date_to, v_to), interval '1 day') d
          where a.date_to >= v_from and a.date_from <= v_to
          group by a.id, 1, a.type, pr.full_name
        ) s
        where days > 0
      ), '[]'::jsonb)
    )
  );
end;
$$;
