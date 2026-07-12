-- send_offer_email jako cienki nadawca: HTML buduje klient, żeby podgląd
-- w aplikacji był 1:1 z tym, co dostaje klient. Dochodzi też touch_last_seen
-- (pewny ping obecności zamiast bezpośredniego UPDATE z klienta).
drop function if exists public.send_offer_email(text, text, text, text, text, date);

create or replace function public.send_offer_email(
  p_to text,
  p_subject text,
  p_html text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_status int;
begin
  if auth.uid() is null then
    raise exception 'Brak uwierzytelnienia';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and active) then
    raise exception 'Konto nieaktywne';
  end if;
  if p_to is null or p_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Brak poprawnego adresu e-mail klienta';
  end if;
  if coalesce(btrim(p_subject), '') = '' or coalesce(btrim(p_html), '') = '' then
    raise exception 'Brak tresci wiadomosci';
  end if;

  select value into v_key from public.app_secrets where key = 'resend_api_key';
  if v_key is null then
    raise exception 'Brak skonfigurowanego klucza Resend';
  end if;

  select (r).status into v_status from (
    select extensions.http((
      'POST',
      'https://api.resend.com/emails',
      array[extensions.http_header('Authorization', 'Bearer ' || v_key)],
      'application/json',
      json_build_object(
        'from', 'BFTM Fasad & Bygg AB <kontakt@bftm.se>',
        'to', json_build_array(p_to),
        'reply_to', 'mateus@bftm.se',
        'subject', p_subject,
        'html', p_html
      )::text
    )::extensions.http_request) as r
  ) t;

  if v_status is null or v_status < 200 or v_status >= 300 then
    raise exception 'Nie udalo sie wyslac wiadomosci (Resend %)', coalesce(v_status::text, 'brak odpowiedzi');
  end if;
end;
$$;

revoke all on function public.send_offer_email(text, text, text) from public;
grant execute on function public.send_offer_email(text, text, text) to authenticated;

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

revoke all on function public.touch_last_seen() from public;
grant execute on function public.touch_last_seen() to authenticated;
