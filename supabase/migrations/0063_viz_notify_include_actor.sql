-- 0063 — Powiadomienie o zmianie statusu punktu trafia też do osoby, która
-- sama zmieniła status (bez wykluczania autora zmiany).

create or replace function public.notify_viz_point_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  select title into v_title from public.visualizations where id = new.visualization_id;

  insert into public.notifications (recipient_id, type, title, body)
  select
    p.id,
    'viz_point_status',
    case p.lang
      when 'sv' then 'Punktstatus ändrad'
      when 'en' then 'Point status changed'
      when 'uk' then 'Статус точки змінено'
      else 'Zmiana statusu punktu'
    end,
    coalesce(nullif(v_title, ''), 'Wizualizacja') || ' • '
      || case when new.status = 'done'
           then case p.lang when 'sv' then 'Klart' when 'en' then 'Done' when 'uk' then 'Готово' else 'Gotowe' end
           else case p.lang when 'sv' then 'Ej klart' when 'en' then 'To do' when 'uk' then 'Не зроблено' else 'Niezrobione' end
         end
      || case when coalesce(new.description, '') <> '' then ' — ' || left(new.description, 60) else '' end
  from public.profiles p
  where p.active
    and (
      p.role = 'admin'
      or coalesce((p.permissions->>'visualizations_manage')::boolean, false)
      or coalesce((p.permissions->>'visualizations_work')::boolean, false)
    );

  return new;
end;
$$;

revoke execute on function public.notify_viz_point_status() from public, anon, authenticated;
