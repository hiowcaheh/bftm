-- 0042 — funkcje triggerowe nie mają być widoczne w REST API (spójnie z 0035).
revoke execute on function public.notify_absence_created() from anon, authenticated;
revoke execute on function public.notify_offer_viewed() from anon, authenticated;
