-- 0078 — offer_public: otwarcie oferty liczy się najwyżej raz na 30 minut.
-- Wcześniej każde odświeżenie / powrót klienta do karty dawało +1 do licznika
-- i push „Klient otworzył ofertę” do każdego admina (1 oferta → 26 powiadomień).
-- Okno 30 min jak w visualization_public (0058). Reszta funkcji bez zmian.
set local lock_timeout = '5s';
alter table public.offers add column if not exists last_viewed_at timestamptz;

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

  if p_track and o.status <> 'draft'
     and (o.last_viewed_at is null or o.last_viewed_at < now() - interval '30 minutes') then
    update public.offers
      set viewed_at = coalesce(viewed_at, now()),
          last_viewed_at = now(),
          view_count = view_count + 1
      where id = o.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'description', i.description,
      'unit', i.unit,
      'quantity', i.quantity,
      'quantity_max', i.quantity_max,
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
