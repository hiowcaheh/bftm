-- 0031 — Pobieranie danych firmy po organisationsnummer (VAT/VIES).
-- Woła darmowe API VATComply (proxy do unijnego VIES) przez rozszerzenie http.
-- Szwedzki nr VAT = 10-cyfrowy orgnr + '01'. Zwraca nazwę i adres do autouzupełnienia.
-- Dostęp: aktywny użytkownik z prawem edycji klientów (lub admin).

create extension if not exists http with schema extensions;

create or replace function public.lookup_company_by_orgnr(p_orgnr text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_digits text;
  v_vat text;
  v_status int;
  v_content text;
  v_json jsonb;
  v_addr text;
begin
  if not (public.is_active() and (public.is_admin() or public.has_perm('clients_edit'))) then
    raise exception 'Brak uprawnień';
  end if;

  v_digits := regexp_replace(coalesce(p_orgnr, ''), '\D', '', 'g');
  if length(v_digits) = 10 then
    v_vat := v_digits || '01';
  elsif length(v_digits) = 12 then
    v_vat := v_digits;
  else
    return jsonb_build_object('valid', false, 'error', 'format');
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '12');
    select status, content into v_status, v_content
    from extensions.http_get('https://api.vatcomply.com/vat?vat_number=SE' || v_vat);
    if v_status <> 200 then
      return jsonb_build_object('valid', false, 'error', 'http_' || v_status);
    end if;
    v_json := v_content::jsonb;
  exception when others then
    return jsonb_build_object('valid', false, 'error', 'network');
  end;

  if coalesce((v_json ->> 'valid')::boolean, false) = false then
    return jsonb_build_object('valid', false);
  end if;

  -- Adres z VIES bywa wielolinijkowy — łamiemy nowe linie na przecinek.
  v_addr := coalesce(v_json ->> 'address', '');
  v_addr := regexp_replace(v_addr, E'\\s*\\n+\\s*', ', ', 'g');
  v_addr := btrim(regexp_replace(v_addr, E'\\s+', ' ', 'g'));

  return jsonb_build_object(
    'valid', true,
    'name', v_json ->> 'name',
    'address', nullif(v_addr, ''),
    'orgnr', left(v_digits, 10)
  );
end;
$$;

revoke execute on function public.lookup_company_by_orgnr(text) from public, anon;
grant execute on function public.lookup_company_by_orgnr(text) to authenticated;
