-- 0010 — Fakturowanie etapami: wiele faktur na projekt (project_invoices)
-- zamiast pojedynczych kolumn invoice_* na projects. Istniejące dane
-- przenoszone, stare kolumny usuwane, RPC podsumowania przebudowane.

create table public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  sent_at date not null,
  due_at date,
  paid_at date,
  note text,
  created_at timestamptz not null default now()
);
create index project_invoices_project_idx
  on public.project_invoices (project_id, sent_at desc);

alter table public.project_invoices enable row level security;

create policy project_invoices_finance on public.project_invoices
  for all to authenticated
  using (public.is_admin() or public.has_perm('finance_view'))
  with check (public.is_admin() or public.has_perm('finance_view'));

-- Migracja danych z krótkotrwałych kolumn na projects (0008)
insert into public.project_invoices (project_id, amount, sent_at, due_at, paid_at)
select id, coalesce(invoice_amount, 0), invoice_sent_at, invoice_due_at, invoice_paid_at
from public.projects
where invoice_sent_at is not null;

alter table public.projects
  drop column invoice_sent_at,
  drop column invoice_due_at,
  drop column invoice_paid_at,
  drop column invoice_amount;

-- Nowa sygnatura zwrotki (agregaty faktur zamiast pól pojedynczej faktury)
drop function public.finance_project_summary(date, date);

create function public.finance_project_summary(p_from date, p_to date)
returns table (
  project_id uuid,
  name text,
  color text,
  status text,
  billing_type text,
  hourly_rate numeric,
  fixed_value numeric,
  hours_range numeric,
  labor_cost_range numeric,
  hours_total numeric,
  labor_cost_total numeric,
  expenses_range numeric,
  expenses_total numeric,
  additional_approved numeric,
  invoiced_total numeric,
  paid_total numeric,
  awaiting_total numeric,
  paid_range_total numeric,
  invoice_count bigint,
  next_due_at date
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
  ),
  invoices as (
    select
      pi.project_id,
      sum(pi.amount) as invoiced_total,
      sum(pi.amount) filter (where pi.paid_at is not null) as paid_total,
      sum(pi.amount) filter (where pi.paid_at is null) as awaiting_total,
      sum(pi.amount) filter (where pi.paid_at between p_from and p_to)
        as paid_range_total,
      count(*) as invoice_count,
      min(pi.due_at) filter (where pi.paid_at is null) as next_due_at
    from public.project_invoices pi
    group by pi.project_id
  )
  select
    p.id,
    p.name,
    p.color,
    p.status,
    p.billing_type,
    p.hourly_rate,
    p.fixed_value,
    coalesce(sum(wc.hours) filter (where wc.date between p_from and p_to), 0),
    coalesce(round(sum(wc.cost) filter (where wc.date between p_from and p_to), 2), 0),
    coalesce(sum(wc.hours), 0),
    coalesce(round(sum(wc.cost), 2), 0),
    (select coalesce(sum(e.amount_gross), 0) from public.expenses e
      where e.project_id = p.id and e.date between p_from and p_to),
    (select coalesce(sum(e.amount_gross), 0) from public.expenses e
      where e.project_id = p.id),
    (select coalesce(sum(aw.value), 0) from public.additional_works aw
      where aw.project_id = p.id and aw.status in ('approved', 'invoiced')),
    coalesce(max(i.invoiced_total), 0),
    coalesce(max(i.paid_total), 0),
    coalesce(max(i.awaiting_total), 0),
    coalesce(max(i.paid_range_total), 0),
    coalesce(max(i.invoice_count), 0),
    max(i.next_due_at)
  from public.projects p
  left join wage_cost wc on wc.project_id = p.id
  left join invoices i on i.project_id = p.id
  group by p.id;
end;
$$;

revoke execute on function public.finance_project_summary(date, date) from public, anon;
grant execute on function public.finance_project_summary(date, date) to authenticated;
