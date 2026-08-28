-- 0061 — Punkt wizualizacji: znacznik OSTATNIEJ zmiany statusu (w obie strony).
-- Wcześniej done_at czyściło się przy powrocie na 'todo'. Teraz done_at/done_by
-- to „kto i kiedy ostatnio zmienił status" — pozwala pokazać także „zmienił
-- status na niezrobione". Klient dalej pokazuje „Klart {done_at}" tylko gdy
-- status = 'done' (wtedy done_at = moment oznaczenia jako gotowe).

create or replace function public.viz_point_status_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.done_at := now();
      new.done_by := coalesce((select auth.uid()), new.created_by);
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.done_at := now();
    new.done_by := (select auth.uid());
  end if;
  return new;
end;
$$;
