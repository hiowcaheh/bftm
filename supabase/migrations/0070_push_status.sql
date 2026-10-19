-- 0070 — czy pracownik ma włączony push (Zespół → „Bez powiadomień"/„Push").
-- push_subscriptions ma RLS owner-only, więc admin dostaje tylko flagę tak/nie.
create or replace function public.push_status()
returns table(profile_id uuid, has_push boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, exists (select 1 from public.push_subscriptions s where s.profile_id = p.id)
  from public.profiles p
  where public.is_admin();
$$;
revoke execute on function public.push_status() from public, anon;
grant execute on function public.push_status() to authenticated;
