-- 0015 — Podgląd szkicu przed wysłaniem (token bez zmiany statusu),
-- kontakty imienne firmy (Tomasz/Mateusz), usługi i opis po ludzku.

-- Token dla szkicu — status zostaje draft, właściciel może obejrzeć podgląd
create or replace function public.offer_ensure_token(p_offer_id uuid)
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
    set public_token = coalesce(public_token, encode(extensions.gen_random_bytes(32), 'hex'))
    where id = p_offer_id
    returning public_token into v_token;

  if v_token is null then
    raise exception 'Nie znaleziono oferty';
  end if;
  return v_token;
end;
$$;
revoke execute on function public.offer_ensure_token(uuid) from public, anon;
grant execute on function public.offer_ensure_token(uuid) to authenticated;

-- offer_public: szkice też widoczne po tokenie (token zna tylko właściciel,
-- dopóki nie wyśle); wyświetlenia liczone wyłącznie dla wysłanych ofert
create or replace function public.offer_public(p_token text, p_track boolean default true)
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

  select * into o from public.offers where public_token = p_token;
  if not found then
    return null;
  end if;

  if p_track and o.status <> 'draft' then
    update public.offers
      set viewed_at = coalesce(viewed_at, now()),
          view_count = view_count + 1
      where id = o.id;
  end if;

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
    'guarantee', o.guarantee,
    'ata_info', o.ata_info,
    'travel_info', o.travel_info,
    'payment_days', o.payment_days,
    'responded_at', o.responded_at,
    'client', coalesce(o.client_snapshot, '{}'::jsonb),
    'items', v_items,
    'company', coalesce(v_company, '{}'::jsonb),
    'branding', coalesce(v_branding, '{}'::jsonb),
    'rot', coalesce(v_finance -> 'rot', '{}'::jsonb)
  );
end;
$$;

-- Usługi (Tätskikt zamiast Målning), ludzki opis, kontakty imienne
update public.settings
set value = value || jsonb_build_object(
  'services', '["Fasad & puts", "Takarbeten", "Bygg & renovering", "Tätskikt"]'::jsonb,
  'about', 'Vi är ett bygg- och fasadföretag från Huddinge som jobbar i hela Stockholmsområdet. Genom åren har vi putsat fasader, lagt tak och renoverat åt villaägare, bostadsrättsföreningar och byggbolag — och många av våra kunder kommer tillbaka. Vi svarar i telefon, håller tider och lämnar alltid en städad arbetsplats efter oss.',
  'contacts', '[{"name": "Tomasz", "phone": "079-031 08 27"}, {"name": "Mateusz", "phone": "072-852 55 21"}]'::jsonb
),
updated_at = now()
where key = 'company_details';
