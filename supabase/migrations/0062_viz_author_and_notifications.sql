-- 0062 — Wizualizacje: autor (created_by) + powiadomienia o zmianie statusu punktu.

-- 1) created_by ustawiane automatycznie przy tworzeniu (nie da się sfałszować).
create or replace function public.viz_set_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists visualizations_set_created_by on public.visualizations;
create trigger visualizations_set_created_by
  before insert on public.visualizations
  for each row execute function public.viz_set_created_by();

-- Backfill istniejących: autor = kto opublikował (z activity_log).
update public.visualizations v
  set created_by = a.actor
from public.activity_log a
where v.created_by is null
  and a.entity = 'visualization' and a.entity_id = v.id
  and a.action = 'publish' and a.actor is not null;

-- 2) Powiadomienie o zmianie statusu punktu — dla admina oraz osób z flagą
--    visualizations_manage lub visualizations_work (poza tym, kto zmienił).
create or replace function public.notify_viz_point_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_actor uuid;
begin
  v_actor := coalesce(new.done_by, (select auth.uid()));
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
    and p.id <> v_actor
    and (
      p.role = 'admin'
      or coalesce((p.permissions->>'visualizations_manage')::boolean, false)
      or coalesce((p.permissions->>'visualizations_work')::boolean, false)
    );

  return new;
end;
$$;

drop trigger if exists visualization_points_notify_status on public.visualization_points;
create trigger visualization_points_notify_status
  after update of status on public.visualization_points
  for each row
  when (new.status is distinct from old.status)
  execute function public.notify_viz_point_status();

revoke execute on function public.viz_set_created_by() from public, anon, authenticated;
revoke execute on function public.notify_viz_point_status() from public, anon, authenticated;
