-- 0041 — powiadomienia: nowa nieobecność (dla admina/flagi absences_manage)
-- oraz otwarcie oferty przez klienta (dla admina/flagi offers_edit).
-- Teksty w języku odbiorcy (profiles.lang), wzorzec jak notify_checklist_created.

create or replace function public.notify_absence_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee text;
  v_range text;
begin
  select full_name into v_employee from public.profiles where id = new.employee_id;
  v_range := case
    when new.date_from = new.date_to then to_char(new.date_from, 'DD.MM.YYYY')
    else to_char(new.date_from, 'DD.MM') || '–' || to_char(new.date_to, 'DD.MM.YYYY')
  end;

  insert into public.notifications (recipient_id, type, title, body)
  select
    p.id,
    'absence',
    case p.lang
      when 'sv' then 'Ny frånvaro'
      when 'en' then 'New absence'
      when 'uk' then 'Нова відсутність'
      else 'Nowa nieobecność'
    end,
    coalesce(v_employee, '?') || ': '
      || case p.lang
           when 'sv' then case new.type when 'sick' then 'Sjukfrånvaro' when 'vacation' then 'Semester' when 'unpaid' then 'Obetald' when 'vab' then 'VAB' else 'Övrigt' end
           when 'en' then case new.type when 'sick' then 'Sick leave' when 'vacation' then 'Vacation' when 'unpaid' then 'Unpaid' when 'vab' then 'VAB' else 'Other' end
           when 'uk' then case new.type when 'sick' then 'Лікарняний' when 'vacation' then 'Відпустка' when 'unpaid' then 'Неоплачувана' when 'vab' then 'VAB' else 'Інше' end
           else case new.type when 'sick' then 'Chorobowe' when 'vacation' then 'Urlop' when 'unpaid' then 'Bezpłatny' when 'vab' then 'VAB' else 'Inne' end
         end
      || ' • ' || v_range
  from public.profiles p
  where p.active
    and p.id <> new.created_by
    and (p.role = 'admin' or coalesce((p.permissions->>'absences_manage')::boolean, false));

  return new;
end;
$$;

drop trigger if exists absences_notify_created on public.absences;
create trigger absences_notify_created
  after insert on public.absences
  for each row
  execute function public.notify_absence_created();

create or replace function public.notify_offer_viewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client text;
begin
  v_client := coalesce(new.client_snapshot->>'name', '');

  insert into public.notifications (recipient_id, type, title, body)
  select
    p.id,
    'offer_viewed',
    case p.lang
      when 'sv' then 'Kunden öppnade offerten'
      when 'en' then 'Client opened the offer'
      when 'uk' then 'Клієнт відкрив пропозицію'
      else 'Klient otworzył ofertę'
    end,
    coalesce(new.number, '') || coalesce(' — ' || nullif(new.title, ''), '')
      || case when v_client <> '' then ' • ' || v_client else '' end
      || ' • ' || new.view_count || '×'
  from public.profiles p
  where p.active
    and (p.role = 'admin' or coalesce((p.permissions->>'offers_edit')::boolean, false));

  return new;
end;
$$;

drop trigger if exists offers_notify_viewed on public.offers;
create trigger offers_notify_viewed
  after update of view_count on public.offers
  for each row
  when (new.view_count > coalesce(old.view_count, 0))
  execute function public.notify_offer_viewed();
