-- Wysyłka ofert e-mailem przez Resend bezpośrednio z bazy (rozszerzenie http).
-- Wybrane zamiast Edge Function, bo deploy funkcji brzegowych jest w tym
-- środowisku niedostępny. Klucz Resend czytany z app_secrets przez
-- funkcję security-definer (klient nigdy go nie widzi).
create extension if not exists http with schema extensions;

create or replace function public.send_offer_email(
  p_to text,
  p_client_name text,
  p_offer_number text,
  p_title text,
  p_url text,
  p_valid_until date default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_name text;
  v_title text;
  v_number text;
  v_valid text;
  v_url text;
  v_html text;
  v_subject text;
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
  if coalesce(btrim(p_title), '') = '' or coalesce(p_url, '') = '' then
    raise exception 'Brak danych oferty do wyslania';
  end if;

  select value into v_key from public.app_secrets where key = 'resend_api_key';
  if v_key is null then
    raise exception 'Brak skonfigurowanego klucza Resend';
  end if;

  v_name := replace(replace(replace(replace(coalesce(nullif(btrim(p_client_name), ''), 'kund'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
  v_title := replace(replace(replace(replace(btrim(p_title), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
  v_number := replace(replace(replace(coalesce(p_offer_number, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  v_url := replace(replace(coalesce(p_url, ''), '&', '&amp;'), '"', '&quot;');
  v_valid := case when p_valid_until is not null then to_char(p_valid_until, 'YYYY-MM-DD') else null end;
  v_subject := (case when coalesce(p_offer_number, '') <> '' then 'Offert ' || p_offer_number || ' — ' else 'Offert — ' end) || btrim(p_title);

  v_html :=
    '<!doctype html><html lang="sv"><body style="margin:0;padding:0;background:#f2f2f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f5;padding:24px 0;"><tr><td align="center">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">'
    || '<tr><td style="background:#A50000;padding:28px 32px;"><div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.3px;">BFTM Fasad &amp; Bygg AB</div>'
    || case when v_number <> '' then '<div style="color:#ffd6d6;font-size:13px;margin-top:4px;">Offert ' || v_number || '</div>' else '' end
    || '</td></tr>'
    || '<tr><td style="padding:32px;"><p style="margin:0 0 16px;font-size:16px;">Hej ' || v_name || '!</p>'
    || '<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333;">Tack för visat intresse för våra tjänster. Vi har förberett en detaljerad offert för ditt projekt: <strong>' || v_title || '</strong>.</p>'
    || '<p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#333;">Du kan ta del av hela offerten via knappen nedan — utan inloggning, med möjlighet att svara direkt.</p>'
    || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:10px;background:#A50000;"><a href="' || v_url || '" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Öppna offerten</a></td></tr></table>'
    || case when v_valid is not null then '<p style="margin:0 0 8px;font-size:13px;color:#666;">Offerten är giltig till och med <strong>' || v_valid || '</strong>.</p>' else '' end
    || '<p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.5;word-break:break-all;">Om knappen inte fungerar, kopiera länken:<br>' || v_url || '</p>'
    || '</td></tr><tr><td style="padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;font-size:13px;color:#888;">Med vänliga hälsningar,<br>BFTM Fasad &amp; Bygg AB</p></td></tr>'
    || '</table></td></tr></table></body></html>';

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
        'subject', v_subject,
        'html', v_html
      )::text
    )::extensions.http_request) as r
  ) t;

  if v_status is null or v_status < 200 or v_status >= 300 then
    raise exception 'Nie udalo sie wyslac wiadomosci (Resend %)', coalesce(v_status::text, 'brak odpowiedzi');
  end if;
end;
$$;

revoke all on function public.send_offer_email(text, text, text, text, text, date) from public;
grant execute on function public.send_offer_email(text, text, text, text, text, date) to authenticated;
