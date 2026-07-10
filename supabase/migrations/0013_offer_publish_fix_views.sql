-- 0013 — Naprawa offer_publish: gen_random_bytes żyje w schemacie extensions,
-- a funkcja miała search_path=public → „Wyślij klientowi" kończyło się błędem.
-- Dodatkowo licznik wyświetleń oferty (view_count) zliczany przy każdym
-- otwarciu publicznego linku.

alter table public.offers
  add column view_count int not null default 0;

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
    set public_token = coalesce(public_token, encode(extensions.gen_random_bytes(32), 'hex')),
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

-- offer_public: viewed_at (pierwsze otwarcie) + view_count (każde otwarcie)
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
    set viewed_at = coalesce(viewed_at, now()),
        view_count = view_count + 1
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
