-- 0051 — twarde odebranie EXECUTE dla ról API na funkcjach wewnętrznych.
-- revoke z PUBLIC (anon/authenticated dziedziczą po public). Funkcja triggerowa
-- uninvoice_hours_on_delete niedostępna przez REST; invoice_project_hours tylko
-- dla authenticated (self-guard is_admin/has_perm), nie dla anon.
revoke execute on function public.uninvoice_hours_on_delete() from public, anon, authenticated;
revoke execute on function public.invoice_project_hours(uuid, date, date, date, date, text) from public, anon;
grant execute on function public.invoice_project_hours(uuid, date, date, date, date, text) to authenticated;
