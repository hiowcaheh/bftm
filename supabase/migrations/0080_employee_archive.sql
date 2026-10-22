-- 0080 — Archiwum pracowników zamiast trwałego usuwania.
-- Mateusz: „dane muszą zostać” — godziny, nieobecności, stawki i wypłaty byłego
-- pracownika liczą się dalej w Finansach, Raportach i Rezultacie. Archiwizacja =
-- dezaktywacja (admin_set_active: ban + koniec sesji) + archived_at (znika z listy
-- Zespołu i z wyboru pracownika). Przywrócenie zdejmuje archived_at; logowanie
-- włącza się osobno („Aktywuj konto”, które samo zdejmuje też archiwum).
-- Migracja niczego nie usuwa (narzędzie Supabase czeka przy tym na potwierdzenie,
-- które w aplikacji nie dociera): archiwizacja woła istniejące admin_set_active,
-- a stara funkcja trwałego usuwania zostaje podmieniona na blokadę (kasowała
-- godziny, a z avatarem i tak padała na triggerze storage).
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

-- Aktywny = nie w archiwum: aktywacja konta zdejmuje archiwum
create or replace function public.profiles_unarchive_on_activate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.active and not old.active then
    new.archived_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_unarchive_on_activate() from public, anon, authenticated;
create trigger profiles_unarchive_on_activate
  before update of active on public.profiles
  for each row execute function public.profiles_unarchive_on_activate();

create or replace function public.admin_archive_employee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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

  -- blokada logowania + koniec sesji = istniejąca dezaktywacja
  perform public.admin_set_active(p_profile_id, false);

  update public.profiles
  set archived_at = coalesce(archived_at, now())
  where id = p_profile_id;

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

-- Trwałe usuwanie wyłączone (stara aplikacja mogłaby jeszcze je wołać)
create or replace function public.admin_delete_employee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Usuwanie pracowników jest wyłączone — użyj „Przenieś do archiwum”';
end;
$$;

revoke execute on function public.admin_archive_employee(uuid) from public, anon;
grant execute on function public.admin_archive_employee(uuid) to authenticated;
revoke execute on function public.admin_restore_employee(uuid) from public, anon;
grant execute on function public.admin_restore_employee(uuid) to authenticated;
