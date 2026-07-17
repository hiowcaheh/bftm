-- 0040 — aktualna liczba nieprzeczytanych dla urządzenia (badge bez wyścigu).
-- Klucz dostępu: endpoint subskrypcji push (długi, niezgadywalny URL) — funkcja
-- zwraca wyłącznie liczbę, więc ekspozycja dla anon jest bezpieczna.
create or replace function public.unread_count_for_endpoint(p_endpoint text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications n
  join public.push_subscriptions s on s.profile_id = n.recipient_id
  where s.endpoint = p_endpoint and n.read_at is null;
$$;

revoke all on function public.unread_count_for_endpoint(text) from public;
grant execute on function public.unread_count_for_endpoint(text) to anon, authenticated;
