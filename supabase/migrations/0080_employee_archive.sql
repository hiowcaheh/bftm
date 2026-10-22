-- 0080 — Archiwum pracowników zamiast trwałego usuwania.
-- Mateusz: „dane muszą zostać” — godziny, nieobecności, stawki i wypłaty byłego
-- pracownika liczą się dalej w Finansach, Raportach i Rezultacie. Archiwizacja =
-- blokada logowania jak przy dezaktywacji + archived_at (znika z listy Zespołu
-- i z wyboru pracownika). Przywrócenie zdejmuje archived_at; logowanie włącza
-- się osobno (admin_set_active). admin_delete_employee usunięte — kasowało
-- godziny, a z avatarem i tak padało (bezpośredni DELETE na storage.objects
-- blokuje trigger Supabase).
-- profiles czyta każde zapytanie (RLS) — nie czekamy w kolejce na blokadę tabeli
set local lock_timeout = '5s';
alter table public.profiles add column if not exists archived_at timestamptz;

-- archived_at zmienia tylko admin (jak rolę, flagi, active i e-mail)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service_role (Edge Functions) — bez ograniczeń
  end if;
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.active is distinct from old.active
       or new.email is distinct from old.email
       or new.archived_at is distinct from old.archived_at then
      raise exception 'Brak uprawnień do zmiany tych pól profilu';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.admin_archive_employee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'Nie można przenieść własnego konta do archiwum';
  end if;

  select role into v_role from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'Nie znaleziono pracownika';
  end if;
  if v_role = 'admin' then
    raise exception 'Nie można przenieść konta administratora do archiwum';
  end if;

  -- logowanie zablokowane i sesje wygaszone — jak przy dezaktywacji
  update auth.users
  set banned_until = now() + interval '100 years', updated_at = now()
  where id = p_profile_id;
  delete from auth.sessions where user_id = p_profile_id;
  delete from auth.refresh_tokens where user_id = p_profile_id::text;

  update public.profiles
  set active = false, archived_at = coalesce(archived_at, now())
  where id = p_profile_id;

  -- bez pushy na telefon byłego pracownika; wszystkie inne dane zostają
  delete from public.push_subscriptions where profile_id = p_profile_id;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'archive', 'employee', p_profile_id);
end;
$$;

create or replace function public.admin_restore_employee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;

  -- wraca na listę z zablokowanym logowaniem; aktywacja osobno (admin_set_active)
  update public.profiles set archived_at = null
  where id = p_profile_id and archived_at is not null;
  if not found then
    raise exception 'Nie znaleziono pracownika w archiwum';
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'restore', 'employee', p_profile_id);
end;
$$;

-- Aktywacja konta zdejmuje też archiwum (aktywny = nie w archiwum)
create or replace function public.admin_set_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;
  if p_profile_id = auth.uid() and not p_active then
    raise exception 'Nie można dezaktywować własnego konta';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Nie znaleziono pracownika';
  end if;

  update auth.users
  set banned_until = case when p_active then null else now() + interval '100 years' end,
      updated_at = now()
  where id = p_profile_id;

  update public.profiles
  set active = p_active,
      archived_at = case when p_active then null else archived_at end
  where id = p_profile_id;

  if not p_active then
    delete from auth.sessions where user_id = p_profile_id;
    delete from auth.refresh_tokens where user_id = p_profile_id::text;
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), case when p_active then 'reactivate' else 'deactivate' end, 'employee', p_profile_id);
end;
$$;

revoke execute on function public.admin_archive_employee(uuid) from public, anon;
grant execute on function public.admin_archive_employee(uuid) to authenticated;
revoke execute on function public.admin_restore_employee(uuid) from public, anon;
grant execute on function public.admin_restore_employee(uuid) to authenticated;

drop function if exists public.admin_delete_employee(uuid);
