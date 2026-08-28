-- 0064 — Wizualizacje: numer (VIZ-2026-001) jak w ofertach.
-- Numer nadawany automatycznie triggerem BEFORE INSERT (atomowo na
-- settings.viz_numbering), więc nie da się go pominąć ani sfałszować.

alter table public.visualizations add column number text;

-- Licznik numeracji w settings (kształt 1:1 z offer_numbering).
insert into public.settings (key, value)
values (
  'viz_numbering',
  jsonb_build_object('prefix', 'VIZ', 'next', 1, 'per_year', true,
                     'year', extract(year from current_date)::int)
)
on conflict (key) do nothing;

-- Kolejny numer wizualizacji — atomowo, z blokadą wiersza settings.
create or replace function public.viz_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_prefix text;
  v_year int;
  v_next int;
begin
  if new.number is not null then
    return new;
  end if;

  select value into v from public.settings where key = 'viz_numbering' for update;
  v_prefix := coalesce(v ->> 'prefix', 'VIZ');
  v_next := coalesce((v ->> 'next')::int, 1);

  if coalesce((v ->> 'per_year')::boolean, true) then
    v_year := extract(year from current_date)::int;
    if (v ->> 'year') is distinct from v_year::text then
      v_next := 1;
    end if;
    new.number := v_prefix || '-' || v_year || '-' || lpad(v_next::text, 3, '0');
    update public.settings
      set value = jsonb_set(jsonb_set(v, '{next}', to_jsonb(v_next + 1)), '{year}', to_jsonb(v_year)),
          updated_at = now()
      where key = 'viz_numbering';
  else
    new.number := v_prefix || '-' || lpad(v_next::text, 3, '0');
    update public.settings
      set value = jsonb_set(v, '{next}', to_jsonb(v_next + 1)), updated_at = now()
      where key = 'viz_numbering';
  end if;

  return new;
end;
$$;

drop trigger if exists visualizations_assign_number on public.visualizations;
create trigger visualizations_assign_number
  before insert on public.visualizations
  for each row execute function public.viz_assign_number();

-- Backfill istniejących wizualizacji — numery wg kolejności utworzenia.
with ordered as (
  select id, row_number() over (order by created_at) as rn
  from public.visualizations
  where number is null
)
update public.visualizations v
  set number = 'VIZ-' || extract(year from current_date)::int || '-' || lpad(o.rn::text, 3, '0')
from ordered o
where o.id = v.id;

-- Ustaw licznik na kolejny wolny (po backfillu).
update public.settings
  set value = jsonb_set(
        jsonb_set(value, '{next}', to_jsonb((select count(*) from public.visualizations) + 1)),
        '{year}', to_jsonb(extract(year from current_date)::int)),
      updated_at = now()
  where key = 'viz_numbering';

alter table public.visualizations add constraint visualizations_number_key unique (number);

revoke execute on function public.viz_assign_number() from public, anon, authenticated;
