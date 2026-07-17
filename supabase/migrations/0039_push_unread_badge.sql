-- 0039 — payload pusha z liczbą nieprzeczytanych (badge na ikonce aplikacji).
-- Zastosowane przez MCP apply_migration; trigger notifications_push bez zmian.
create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  -- wysyłamy tylko, gdy odbiorca ma jakąkolwiek subskrypcję push
  if not exists (select 1 from public.push_subscriptions where profile_id = new.recipient_id) then
    return new;
  end if;
  select value into v_secret from public.app_secrets where key = 'push_fn_secret';
  if v_secret is null then
    return new;
  end if;
  perform net.http_post(
    url := 'https://ixositdqghamqeproryp.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := jsonb_build_object(
      'recipient_id', new.recipient_id,
      'title', new.title,
      'body', coalesce(new.body, ''),
      'type', new.type,
      -- trigger AFTER INSERT: count obejmuje właśnie wstawiony wiersz
      'unread', (
        select count(*) from public.notifications
        where recipient_id = new.recipient_id and read_at is null
      )
    )
  );
  return new;
end;
$$;
