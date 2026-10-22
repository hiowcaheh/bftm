-- 0079 — report_share_create: publiczny link do raportu bez notatek nieobecności.
-- Strona raportu ich nie pokazywała, ale trafiały do danych dla przeglądarki
-- klienta, a notatka do chorobowego może dotyczyć zdrowia (RODO). Zostają: kto,
-- typ i daty. Reszta funkcji bez zmian (0029).
create or replace function public.report_share_create(
  p_from date,
  p_to date,
  p_title text default null,
  p_include_amounts boolean default true
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_token text;
begin
  if not (public.is_admin() or public.has_perm('reports_view') or public.has_perm('finance_view')) then
    raise exception 'Brak uprawnień do raportów';
  end if;

  v_snapshot := public.report_hours(p_from, p_to);

  if not p_include_amounts then
    v_snapshot := jsonb_set(v_snapshot, '{finance}', 'false'::jsonb);
    v_snapshot := jsonb_set(v_snapshot, '{by_employee}', (
      select coalesce(jsonb_agg(e - 'labor_cost'), '[]'::jsonb)
      from jsonb_array_elements(v_snapshot -> 'by_employee') e
    ));
    v_snapshot := jsonb_set(v_snapshot, '{by_project}', (
      select coalesce(jsonb_agg(p - 'labor_cost' - 'billable' - 'hourly_rate'), '[]'::jsonb)
      from jsonb_array_elements(v_snapshot -> 'by_project') p
    ));
  end if;

  -- Nieobecności w okresie: kto, kiedy, jaki typ — bez notatek
  v_snapshot := jsonb_set(v_snapshot, '{absences}', (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', pr.full_name,
          'type', a.type,
          'date_from', a.date_from,
          'date_to', a.date_to
        )
        order by pr.full_name, a.date_from
      ),
      '[]'::jsonb
    )
    from public.absences a
    join public.profiles pr on pr.id = a.employee_id
    where a.date_from <= p_to and a.date_to >= p_from
  ), true);

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.report_shares (token, title, period_from, period_to, snapshot, created_by)
  values (v_token, nullif(trim(coalesce(p_title, '')), ''), p_from, p_to, v_snapshot, auth.uid());
  return v_token;
end;
$$;
