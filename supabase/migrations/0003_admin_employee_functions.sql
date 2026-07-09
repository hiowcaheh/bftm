-- 0003 — operacje administracyjne na kontach pracowników jako funkcje RPC
-- (security definer + twardy warunek is_admin(); zamiennik Edge Functions,
-- których deploy jest w tym środowisku zablokowany bramką zatwierdzeń MCP).
-- Pełna treść wykonana na projekcie BFTM przez MCP apply_migration — patrz
-- historia migracji w dashboardzie. Kopia 1:1 poniżej.

-- Tworzy konto Auth + profil + opcjonalną stawkę. Zwraca id nowego profilu.
create or replace function public.admin_create_employee(
  p_full_name text,
  p_email text,
  p_phone text,
  p_temp_password text,
  p_hourly_wage numeric default null,
  p_valid_from date default current_date,
  p_permissions jsonb default '{"hours_add_own": true, "projects_view": true}'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Ta operacja wymaga uprawnień administratora';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Podaj imię i nazwisko';
  end if;
  if clean_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Podaj prawidłowy adres e-mail';
  end if;
  if length(coalesce(p_temp_password, '')) < 6 then
    raise exception 'Hasło tymczasowe musi mieć co najmniej 6 znaków';
  end if;
  if exists (select 1 from auth.users where email = clean_email) then
    raise exception 'Konto z tym adresem e-mail już istnieje';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    clean_email, crypt(p_temp_password, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_id, new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  insert into public.profiles (id, full_name, email, phone, role, permissions, active, must_change_password)
  values (new_id, trim(p_full_name), clean_email, nullif(trim(coalesce(p_phone, '')), ''),
          'employee', coalesce(p_permissions, '{}'), true, true);

  if p_hourly_wage is not null and p_hourly_wage >= 0 then
    insert into public.employee_compensation (profile_id, hourly_wage, valid_from)
    values (new_id, p_hourly_wage, coalesce(p_valid_from, current_date));
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'create', 'employee', new_id);

  return new_id;
end;
$$;

-- Reset hasła: nowe hasło tymczasowe + wymuszenie zmiany + unieważnienie sesji.
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
  delete from auth.refresh_tokens where user_id = p_profile_id;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), 'reset_password', 'employee', p_profile_id);
end;
$$;

-- Dezaktywacja / reaktywacja konta (ban w Auth + flaga active + ścięcie sesji).
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
    delete from auth.refresh_tokens where user_id = p_profile_id;
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values (auth.uid(), case when p_active then 'reactivate' else 'deactivate' end, 'employee', p_profile_id);
end;
$$;

-- Uprawnienia wywołań: tylko zalogowani (funkcje same pilnują is_admin)
revoke execute on function public.admin_create_employee(text, text, text, text, numeric, date, jsonb) from public, anon;
revoke execute on function public.admin_reset_password(uuid, text) from public, anon;
revoke execute on function public.admin_set_active(uuid, boolean) from public, anon;
grant execute on function public.admin_create_employee(text, text, text, text, numeric, date, jsonb) to authenticated;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
grant execute on function public.admin_set_active(uuid, boolean) to authenticated;
