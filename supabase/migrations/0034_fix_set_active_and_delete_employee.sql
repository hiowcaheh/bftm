-- 0034 — naprawa dezaktywacji konta + twarde usuwanie pracownika.
--
-- Błąd „operator does not exist: character varying = uuid": kolumna
-- auth.refresh_tokens.user_id ma typ varchar (schemat GoTrue), więc
-- porównanie z uuid wymaga rzutowania ::text. Dotyczyło admin_set_active
-- i admin_reset_password.

create or replace function public.admin_set_active(
  p_profile_id uuid,
  p_active boolean
)
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

  update public.profiles set active = p_active where id = p_profile_id;

  if not p_active then
    delete from auth.sessions where user_id = p_profile_id;
    delete from auth.refresh_tokens where user_id = p_profile_id::text;
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), case when p_active then 'reactivate' else 'deactivate' end, 'employee', p_profile_id);
end;
$$;

create or replace function public.admin_reset_password(
  p_profile_id uuid,
  p_temp_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;
  if length(coalesce(p_temp_password, '')) < 6 then
    raise exception 'Hasło tymczasowe musi mieć co najmniej 6 znaków';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Nie znaleziono pracownika';
  end if;

  update auth.users
  set encrypted_password = crypt(p_temp_password, gen_salt('bf')), updated_at = now()
  where id = p_profile_id;

  update public.profiles set must_change_password = true where id = p_profile_id;

  delete from auth.sessions where user_id = p_profile_id;
  delete from auth.refresh_tokens where user_id = p_profile_id::text;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'reset_password', 'employee', p_profile_id);
end;
$$;

-- Trwałe usunięcie pracownika z całej aplikacji. Kasuje godziny (FK restrict),
-- avatar ze Storage i konto Auth — kaskada z auth.users usuwa profil, a z niego
-- nieobecności, stawki, dane prywatne, powiadomienia, wypłaty i prywatną
-- check-listę. Kolumny created_by/done_by/actor przechodzą na null.
create or replace function public.admin_delete_employee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_avatar text;
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'Nie można usunąć własnego konta';
  end if;

  select avatar_path, role into v_avatar, v_role
  from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'Nie znaleziono pracownika';
  end if;
  if v_role = 'admin' then
    raise exception 'Nie można usunąć konta administratora';
  end if;

  -- work_hours ma on delete restrict — świadomie kasujemy całą historię godzin
  delete from public.work_hours where employee_id = p_profile_id;

  if v_avatar is not null then
    delete from storage.objects where bucket_id = 'avatars' and name = v_avatar;
  end if;

  -- wpis do logu przed kasowaniem (actor = admin, entity_id zostaje jako uuid)
  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'delete', 'employee', p_profile_id);

  -- kaskada: auth.users → profiles → tabele zależne; sesje/tokeny/identities
  -- kasują się razem z użytkownikiem Auth
  delete from auth.users where id = p_profile_id;
end;
$$;

revoke execute on function public.admin_delete_employee(uuid) from public, anon;
grant execute on function public.admin_delete_employee(uuid) to authenticated;
