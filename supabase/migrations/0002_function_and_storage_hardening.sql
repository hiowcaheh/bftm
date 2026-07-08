-- 0002 — hardening po advisory:
-- 1) funkcja triggera nie jest wywoływalna przez klientów,
-- 2) helpery RLS niedostępne dla anon (authenticated musi je mieć — używa ich RLS),
-- 3) publiczny bucket logos bez możliwości listowania przez anon.

revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_perm(text) from public, anon;
revoke execute on function public.is_active() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_perm(text) to authenticated;
grant execute on function public.is_active() to authenticated;

drop policy storage_logos_read on storage.objects;
create policy storage_logos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'logos');
