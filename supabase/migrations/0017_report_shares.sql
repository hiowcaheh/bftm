-- 0017 — Współdzielony raport pod linkiem (jak oferta) + suma poprzedniego
-- miesiąca do porównania. Snapshot zamrożony przy tworzeniu; strona publiczna
-- (anon) czyta wyłącznie przez RPC po tokenie.

create table public.report_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  title text,
  period_from date not null,
  period_to date not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index report_shares_created_idx on public.report_shares (created_at desc);

alter table public.report_shares enable row level security;

create policy report_shares_manage on public.report_shares
  for all to authenticated
  using (public.is_admin() or public.has_perm('reports_view') or public.has_perm('finance_view'))
  with check (public.is_admin() or public.has_perm('reports_view') or public.has_perm('finance_view'));

-- Sama suma godzin okresu (do porównania miesięcy) — lekkie zapytanie.
create or replace function public.report_hours_total(p_from date, p_to date)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (public.is_admin() or public.has_perm('reports_view') or public.has_perm('finance_view')) then
    raise exception 'Brak uprawnień do raportów';
  end if;
  return coalesce((
    select sum(hours) from public.work_hours where date between p_from and p_to
  ), 0);
end;
$$;
revoke execute on function public.report_hours_total(date, date) from public, anon;
grant execute on function public.report_hours_total(date, date) to authenticated;

-- Utworzenie linku: zamraża raport (opcjonalnie bez kwot) i zwraca token.
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

  -- Udostępnienie bez kwot: usuń koszt pracy i wartości do fakturowania
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

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.report_shares (token, title, period_from, period_to, snapshot, created_by)
  values (v_token, nullif(trim(coalesce(p_title, '')), ''), p_from, p_to, v_snapshot, auth.uid());
  return v_token;
end;
$$;
revoke execute on function public.report_share_create(date, date, text, boolean) from public, anon;
grant execute on function public.report_share_create(date, date, text, boolean) to authenticated;

-- Publiczny odczyt raportu po tokenie (anon) + branding firmy do nagłówka.
create or replace function public.report_share_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  r public.report_shares;
  v_company jsonb;
  v_branding jsonb;
begin
  if p_token is null or length(p_token) < 24 then
    return null;
  end if;
  select * into r from public.report_shares where token = p_token;
  if not found then
    return null;
  end if;

  select value into v_company from public.settings where key = 'company_details';
  select value into v_branding from public.settings where key = 'company_branding';

  return jsonb_build_object(
    'title', r.title,
    'period_from', r.period_from,
    'period_to', r.period_to,
    'created_at', r.created_at,
    'report', r.snapshot,
    'company', coalesce(v_company, '{}'::jsonb),
    'branding', coalesce(v_branding, '{}'::jsonb)
  );
end;
$$;
grant execute on function public.report_share_public(text) to anon, authenticated;
