-- 0012 — Oferty: publiczny link z tokenem, numeracja, odpowiedź klienta.
-- Klient (anon) NIE czyta tabel — dostaje ofertę wyłącznie przez RPC
-- security definer po niezgadywalnym tokenie (32 bajty hex).

alter table public.offers
  add column title text,
  add column public_token text unique,
  add column sent_at timestamptz,
  add column viewed_at timestamptz,
  add column responded_at timestamptz,
  add column response_comment text;

-- Kolejny numer oferty (OF-2026-001) — atomowo na settings.offer_numbering
create or replace function public.offer_next_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_prefix text;
  v_year int;
  v_next int;
  v_number text;
begin
  if not (public.is_admin() or public.has_perm('offers_edit')) then
    raise exception 'Brak uprawnień do ofert';
  end if;

  select value into v from public.settings where key = 'offer_numbering' for update;
  v_prefix := coalesce(v ->> 'prefix', 'OF');
  v_next := coalesce((v ->> 'next')::int, 1);
  if coalesce((v ->> 'per_year')::boolean, true) then
    v_year := extract(year from current_date)::int;
    if (v ->> 'year') is distinct from v_year::text then
      v_next := 1;
    end if;
    v_number := v_prefix || '-' || v_year || '-' || lpad(v_next::text, 3, '0');
    update public.settings
      set value = jsonb_set(jsonb_set(v, '{next}', to_jsonb(v_next + 1)), '{year}', to_jsonb(v_year)),
          updated_at = now()
      where key = 'offer_numbering';
  else
    v_number := v_prefix || '-' || lpad(v_next::text, 3, '0');
    update public.settings
      set value = jsonb_set(v, '{next}', to_jsonb(v_next + 1)), updated_at = now()
      where key = 'offer_numbering';
  end if;
  return v_number;
end;
$$;

-- Publikacja: nadaje token (raz), status sent, daty
create or replace function public.offer_publish(p_offer_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not (public.is_admin() or public.has_perm('offers_edit')) then
    raise exception 'Brak uprawnień do ofert';
  end if;

  update public.offers
    set public_token = coalesce(public_token, encode(gen_random_bytes(32), 'hex')),
        status = case when status = 'draft' then 'sent' else status end,
        sent_at = coalesce(sent_at, now()),
        issue_date = coalesce(issue_date, current_date)
    where id = p_offer_id
    returning public_token into v_token;

  if v_token is null then
    raise exception 'Nie znaleziono oferty';
  end if;
  return v_token;
end;
$$;

-- Publiczny odczyt oferty po tokenie (anon): oferta + pozycje + dane firmy.
-- Pierwsze otwarcie zapisuje viewed_at.
create or replace function public.offer_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.offers;
  v_items jsonb;
  v_company jsonb;
  v_branding jsonb;
  v_finance jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  select * into o from public.offers
    where public_token = p_token and status <> 'draft';
  if not found then
    return null;
  end if;

  update public.offers
    set viewed_at = coalesce(viewed_at, now())
    where id = o.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'description', i.description,
      'unit', i.unit,
      'quantity', i.quantity,
      'unit_price', i.unit_price,
      'vat_rate', i.vat_rate,
      'is_labor', i.is_labor
    ) order by i.position, i.created_at), '[]'::jsonb)
    into v_items
    from public.offer_items i where i.offer_id = o.id;

  select value into v_company from public.settings where key = 'company_details';
  select value into v_branding from public.settings where key = 'company_branding';
  select value into v_finance from public.settings where key = 'finance';

  return jsonb_build_object(
    'number', o.number,
    'title', o.title,
    'status', o.status,
    'issue_date', o.issue_date,
    'valid_until', o.valid_until,
    'reverse_vat', o.reverse_vat,
    'rot_enabled', o.rot_enabled,
    'rot_persons', o.rot_persons,
    'notes', o.notes,
    'terms', o.terms,
    'responded_at', o.responded_at,
    'client', coalesce(o.client_snapshot, '{}'::jsonb),
    'items', v_items,
    'company', coalesce(v_company, '{}'::jsonb),
    'branding', coalesce(v_branding, '{}'::jsonb),
    'rot', coalesce(v_finance -> 'rot', '{}'::jsonb)
  );
end;
$$;

-- Odpowiedź klienta (anon): akceptacja / odrzucenie + powiadomienia właścicieli
create or replace function public.offer_respond(
  p_token text,
  p_accept boolean,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.offers;
begin
  select * into o from public.offers
    where public_token = p_token and status = 'sent';
  if not found then
    raise exception 'Offerten är inte längre aktiv';
  end if;

  update public.offers
    set status = case when p_accept then 'accepted' else 'rejected' end,
        responded_at = now(),
        response_comment = nullif(trim(coalesce(p_comment, '')), '')
    where id = o.id;

  insert into public.notifications (recipient_id, type, title, body)
  select p.id,
         'offer_response',
         case when p_accept then 'Oferta zaakceptowana 🎉' else 'Oferta odrzucona' end,
         o.number || coalesce(' — ' || o.title, '') || E'\n'
           || coalesce('Klient: ' || (o.client_snapshot ->> 'name') || E'\n', '')
           || coalesce('Komentarz: ' || nullif(trim(coalesce(p_comment, '')), ''), '')
  from public.profiles p
  where p.role = 'admin' and p.active;
end;
$$;

revoke execute on function public.offer_next_number() from public, anon;
grant execute on function public.offer_next_number() to authenticated;
revoke execute on function public.offer_publish(uuid) from public, anon;
grant execute on function public.offer_publish(uuid) to authenticated;
grant execute on function public.offer_public(text) to anon, authenticated;
grant execute on function public.offer_respond(text, boolean, text) to anon, authenticated;
