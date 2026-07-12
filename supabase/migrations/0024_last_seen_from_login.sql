-- Obecność „ostatnio online" niezależna od wersji aplikacji klienta:
-- każde logowanie (wpis do activity_log) odświeża profiles.last_seen_at.
-- Dodatkowo backfill z historii logowań, żeby daty pojawiły się od razu.

-- 1) Backfill z ostatniego logowania w dzienniku
update public.profiles p
set last_seen_at = sub.last_login
from (
  select actor, max(created_at) as last_login
  from public.activity_log
  where action = 'login' and actor is not null
  group by actor
) sub
where p.id = sub.actor
  and (p.last_seen_at is null or p.last_seen_at < sub.last_login);

-- 2) Trigger na logowanie
create or replace function public.on_login_touch_last_seen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action = 'login' and new.actor is not null then
    update public.profiles set last_seen_at = now() where id = new.actor;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_login_touch_last_seen on public.activity_log;
create trigger trg_login_touch_last_seen
  after insert on public.activity_log
  for each row execute function public.on_login_touch_last_seen();
