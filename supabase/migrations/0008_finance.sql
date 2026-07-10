-- 0008 — Finanse: fakturowanie projektów + agregaty finansowe (RPC).
-- Stawki pracowników NIE opuszczają bazy — klient dostaje wyłącznie
-- zagregowane koszty przez funkcje security definer wymagające finance_view.

alter table public.projects
  add column invoice_sent_at date,
  add column invoice_due_at date,
  add column invoice_paid_at date,
  add column invoice_amount numeric(12, 2);

-- Pełny koszt pracodawcy: stawka × (1+semester) × (1+AGA) × (1+narzut własny).
-- Wartości procentowe pochodzą z settings.finance — edytowalne, nic na sztywno.
create or replace function public.finance_cost_multiplier()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select (1 + coalesce((value ->> 'vacation_pay_pct')::numeric, 0) / 100)
         * (1 + coalesce((value ->> 'employer_fee_pct')::numeric, 0) / 100)
         * (1 + coalesce((value ->> 'overhead_pct')::numeric, 0) / 100)
    from public.settings
    where key = 'finance'
  ), 1);
$$;
revoke execute on function public.finance_cost_multiplier() from public, anon, authenticated;

-- Rentowność per projekt: godziny i pełny koszt pracy (okres + całość),
-- paragony, zaakceptowane prace dodatkowe, pola fakturowania.
create or replace function public.finance_project_summary(p_from date, p_to date)
returns table (
  project_id uuid,
  name text,
  color text,
  status text,
  billing_type text,
  hourly_rate numeric,
  fixed_value numeric,
  invoice_sent_at date,
  invoice_due_at date,
  invoice_paid_at date,
  invoice_amount numeric,
  hours_range numeric,
  labor_cost_range numeric,
  hours_total numeric,
  labor_cost_total numeric,
  expenses_range numeric,
  expenses_total numeric,
  additional_approved numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_mult numeric := public.finance_cost_multiplier();
begin
  if not (public.is_admin() or public.has_perm('finance_view')) then
    raise exception 'Brak uprawnień do danych finansowych';
  end if;

  return query
  with wage_cost as (
    select
      wh.project_id,
      wh.date,
      wh.hours,
      wh.hours * coalesce((
        select ec.hourly_wage
        from public.employee_compensation ec
        where ec.profile_id = wh.employee_id and ec.valid_from <= wh.date
        order by ec.valid_from desc
        limit 1
      ), 0) * v_mult as cost
    from public.work_hours wh
  )
  select
    p.id,
    p.name,
    p.color,
    p.status,
    p.billing_type,
    p.hourly_rate,
    p.fixed_value,
    p.invoice_sent_at,
    p.invoice_due_at,
    p.invoice_paid_at,
    p.invoice_amount,
    coalesce(sum(wc.hours) filter (where wc.date between p_from and p_to), 0),
    coalesce(round(sum(wc.cost) filter (where wc.date between p_from and p_to), 2), 0),
    coalesce(sum(wc.hours), 0),
    coalesce(round(sum(wc.cost), 2), 0),
    (select coalesce(sum(e.amount_gross), 0) from public.expenses e
      where e.project_id = p.id and e.date between p_from and p_to),
    (select coalesce(sum(e.amount_gross), 0) from public.expenses e
      where e.project_id = p.id),
    (select coalesce(sum(aw.value), 0) from public.additional_works aw
      where aw.project_id = p.id and aw.status in ('approved', 'invoiced'))
  from public.projects p
  left join wage_cost wc on wc.project_id = p.id
  group by p.id;
end;
$$;

-- Dzienny przebieg do wykresów: godziny, pełny koszt pracy, wypracowany
-- przychód (godziny × stawka klienta dla projektów godzinowych/mieszanych)
-- oraz paragony — pełne dni zakresu, także puste.
create or replace function public.finance_daily(p_from date, p_to date)
returns table (
  day date,
  hours numeric,
  labor_cost numeric,
  revenue numeric,
  expenses numeric
)
language plpgsql
security definer
set search_path = public
stable
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
      round(sum(wh.hours * coalesce((
        select ec.hourly_wage
        from public.employee_compensation ec
        where ec.profile_id = wh.employee_id and ec.valid_from <= wh.date
        order by ec.valid_from desc
        limit 1
      ), 0) * v_mult), 2) as cost,
      sum(case when p.billing_type in ('hourly', 'mixed')
        then wh.hours * coalesce(p.hourly_rate, 0) else 0 end) as revenue
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

revoke execute on function public.finance_project_summary(date, date) from public, anon;
revoke execute on function public.finance_daily(date, date) from public, anon;
grant execute on function public.finance_project_summary(date, date) to authenticated;
grant execute on function public.finance_daily(date, date) to authenticated;
