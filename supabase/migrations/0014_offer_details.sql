-- 0014 — Oferta jak w starym systemie: garanti, ÄTA-arbeten, reseräkning,
-- termin płatności; opis firmy i lista usług na stronie oferty (edytowalne
-- w Ustawieniach — company_details); podgląd właściciela nie nabija
-- licznika wyświetleń (offer_public z parametrem p_track).

alter table public.offers
  add column guarantee text,
  add column ata_info text,
  add column travel_info text,
  add column payment_days int;

-- Opis firmy + usługi (strona oferty) — puste wartości uzupełniane raz,
-- właściciel edytuje w Ustawienia → Firma.
update public.settings
set value = value
  || jsonb_build_object(
    'about', coalesce(value ->> 'about',
      'BFTM Fasad & Bygg AB är ett bygg- och fasadföretag verksamt i Stockholm med omnejd. Vi utför allt inom fasad, puts, tak och renovering — alltid med fokus på kvalitet, ordning på arbetsplatsen och tydlig kommunikation. Bakom oss står många nöjda kunder: privatpersoner, bostadsrättsföreningar och byggbolag. Vår kvalitet är din trygghet.'),
    'services', coalesce(value -> 'services',
      '["Fasad & puts", "Takarbeten", "Bygg & renovering", "Målning"]'::jsonb)
  ),
  updated_at = now()
where key = 'company_details';

-- Nowa sygnatura: p_track=false (podgląd z aplikacji) nie zlicza wyświetlenia
drop function public.offer_public(text);

create function public.offer_public(p_token text, p_track boolean default true)
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

  if p_track then
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

grant execute on function public.offer_public(text, boolean) to anon, authenticated;
