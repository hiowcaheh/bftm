-- 0016 — Raporty okresowe: godziny per pracownik i per projekt.
-- RPC security definer; kwoty (stawka klienta, koszt pracy) tylko przy
-- finance_view — stawki nie opuszczają bazy. Godziny widzi też reports_view.

create or replace function public.report_hours(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_finance boolean := public.is_admin() or public.has_perm('finance_view');
  v_mult numeric := public.finance_cost_multiplier();
  v_by_employee jsonb;
  v_by_project jsonb;
  v_total numeric;
begin
  if not (public.is_admin() or public.has_perm('reports_view') or v_finance) then
    raise exception 'Brak uprawnień do raportów';
  end if;

  -- godziny + koszt pracy per wpis (koszt liczony tylko przy finance_view)
  with wh as (
    select
      w.employee_id,
      w.project_id,
      w.hours,
      w.status,
      case when v_finance then
        w.hours * coalesce((
          select ec.hourly_wage from public.employee_compensation ec
          where ec.profile_id = w.employee_id and ec.valid_from <= w.date
          order by ec.valid_from desc limit 1
        ), 0) * v_mult
      else 0 end as labor_cost
    from public.work_hours w
    where w.date between p_from and p_to
  )
  select
    -- per pracownik: sumy + rozbicie na projekty
    (select coalesce(jsonb_agg(e order by (e ->> 'name')), '[]'::jsonb) from (
      select jsonb_build_object(
        'id', pr.id,
        'name', pr.full_name,
        'total', sum(wh.hours),
        'approved', sum(wh.hours) filter (where wh.status = 'approved'),
        'draft', sum(wh.hours) filter (where wh.status = 'draft'),
        'invoiced', sum(wh.hours) filter (where wh.status = 'invoiced'),
        'labor_cost', case when v_finance then round(sum(wh.labor_cost), 2) else null end,
        'projects', (
          select jsonb_agg(jsonb_build_object(
            'name', p2.name, 'color', p2.color, 'hours', sub.h
          ) order by sub.h desc)
          from (
            select wh2.project_id, sum(wh2.hours) as h
            from wh wh2 where wh2.employee_id = pr.id
            group by wh2.project_id
          ) sub join public.projects p2 on p2.id = sub.project_id
        )
      ) as e
      from wh join public.profiles pr on pr.id = wh.employee_id
      group by pr.id, pr.full_name
    ) emps),
    -- per projekt: godziny, (finance) stawka klienta i wartość do fakturowania
    (select coalesce(jsonb_agg(pj order by (pj ->> 'name')), '[]'::jsonb) from (
      select jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'color', p.color,
        'billing_type', p.billing_type,
        'total', sum(wh.hours),
        'employees', count(distinct wh.employee_id),
        'labor_cost', case when v_finance then round(sum(wh.labor_cost), 2) else null end,
        'hourly_rate', case when v_finance then p.hourly_rate else null end,
        'billable', case when v_finance and p.billing_type in ('hourly', 'mixed')
          then round(sum(wh.hours) * coalesce(p.hourly_rate, 0), 2) else null end
      ) as pj
      from wh join public.projects p on p.id = wh.project_id
      group by p.id
    ) projs),
    (select coalesce(sum(hours), 0) from wh)
  into v_by_employee, v_by_project, v_total;

  return jsonb_build_object(
    'by_employee', v_by_employee,
    'by_project', v_by_project,
    'total_hours', v_total,
    'finance', v_finance
  );
end;
$$;

revoke execute on function public.report_hours(date, date) from public, anon;
grant execute on function public.report_hours(date, date) to authenticated;
