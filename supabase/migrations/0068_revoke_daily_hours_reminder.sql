-- 0068 — daily_hours_reminder() była wywoływalna przez anon/authenticated (RPC),
-- co pozwalało o 20:00 wysłać pracownikom powtórzone pushe. Woła ją tylko cron.
revoke execute on function public.daily_hours_reminder() from public, anon, authenticated;
