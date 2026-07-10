-- 0011 — Model kosztu pracy zgodny z wypłatą (lönespecifikation):
-- domyślnie koszt = brutto + arbetsgivaravgifter (bez semesterersättning,
-- bo pracownicy mają semesterdagar — urlop kosztuje przy odbiorze, nie co
-- godzinę). Flaga include_vacation_in_labor_cost pozwala doliczać rezerwę
-- urlopową dla pełnego kosztu ekonomicznego.

update public.settings
set value = value || '{"include_vacation_in_labor_cost": false}'::jsonb,
    updated_at = now()
where key = 'finance'
  and not (value ? 'include_vacation_in_labor_cost');

create or replace function public.finance_cost_multiplier()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select
      (case
        when coalesce((value ->> 'include_vacation_in_labor_cost')::boolean, false)
          then 1 + coalesce((value ->> 'vacation_pay_pct')::numeric, 0) / 100
        else 1
      end)
      * (1 + coalesce((value ->> 'employer_fee_pct')::numeric, 0) / 100)
      * (1 + coalesce((value ->> 'overhead_pct')::numeric, 0) / 100)
    from public.settings
    where key = 'finance'
  ), 1);
$$;
