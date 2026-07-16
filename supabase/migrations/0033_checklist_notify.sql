-- 0033 — Powiadomienie (dzwoneczek) dla wszystkich aktywnych pracowników przy
-- utworzeniu nowego zadania na FIRMOWEJ check-liście. Bez powiadomień przy
-- zmianie statusu / usunięciu. Trigger security definer omija RLS notifications.

create or replace function public.notify_checklist_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator text;
  v_project text;
begin
  if new.scope <> 'company' then
    return new;
  end if;

  select full_name into v_creator from public.profiles where id = new.created_by;
  select name into v_project from public.projects where id = new.project_id;

  insert into public.notifications (recipient_id, type, title, body)
  select
    p.id,
    'checklist',
    'Nowe zadanie na check-liście',
    coalesce(v_creator || ': ', '') || new.text || coalesce(' • ' || v_project, '')
  from public.profiles p
  where p.active and p.id <> new.created_by;

  return new;
end;
$$;

create trigger checklist_notify_created
  after insert on public.checklist_items
  for each row
  execute function public.notify_checklist_created();
