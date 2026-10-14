-- 0067 — przypomnienie (powiadomienie + push) o fakturach po terminie.
-- Rano o 8:00 w Sztokholmie: dzień po terminie, potem co 7 dni, dopóki faktura
-- nie jest opłacona. Odbiorcy: aktywni admini i osoby z flagą finance_view.
-- pg_cron chodzi w UTC — job strzela o 6 i 7 UTC, funkcja sama sprawdza 8:00.

create or replace function public.overdue_invoice_reminder()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_local timestamp := now() at time zone 'Europe/Stockholm';
  v_today date;
begin
  if extract(hour from v_local) <> 8 then return; end if;
  v_today := v_local::date;

  insert into notifications (recipient_id, type, title, body)
  select
    r.id,
    'invoice_overdue',
    case r.lang
      when 'sv' then 'Förfallen faktura'
      when 'en' then 'Overdue invoice'
      when 'uk' then 'Прострочений рахунок'
      else 'Faktura po terminie'
    end,
    -- „Dellensvägen 5 — 41 840 kr, 42 dni po terminie."
    coalesce(p.name, '—') || ' — '
      || replace(to_char(round(i.amount), 'FM999,999,990'), ',', ' ') || ' kr, '
      || case r.lang
        when 'sv' then d.n || case when d.n = 1 then ' dag' else ' dagar' end || ' efter förfallodagen.'
        when 'en' then d.n || case when d.n = 1 then ' day' else ' days' end || ' overdue.'
        when 'uk' then 'прострочено на ' || d.n || case
            when d.n % 10 = 1 and d.n % 100 <> 11 then ' день'
            when d.n % 10 between 2 and 4 and d.n % 100 not between 12 and 14 then ' дні'
            else ' днів' end || '.'
        else d.n || case when d.n = 1 then ' dzień' else ' dni' end || ' po terminie.'
      end
  from project_invoices i
  join projects p on p.id = i.project_id
  cross join lateral (select (v_today - i.due_at) as n) d
  cross join profiles r
  where i.paid_at is null
    and i.due_at is not null
    and d.n >= 1
    and (d.n - 1) % 7 = 0
    and r.active
    and (r.role = 'admin' or coalesce((r.permissions ->> 'finance_view')::boolean, false));
end;
$$;

revoke execute on function public.overdue_invoice_reminder() from public, anon, authenticated;

select cron.schedule(
  'overdue-invoice-reminder',
  '0 6,7 * * *',
  'select public.overdue_invoice_reminder()'
);
