-- 0058 — Poprawki modułu Wizualizacje.
--
-- 1) Token: funkcje generujące token używają gen_random_bytes (pgcrypto,
--    schemat `extensions`). Poprzednio miały search_path=public, więc funkcja
--    nie była znajdowana i publish/ensure_token rzucały błąd (nie dało się
--    wysłać, skopiować linku ani otworzyć podglądu). Dodajemy `extensions`.
-- 2) Podgląd: visualization_public zwraca dane po tokenie niezależnie od
--    statusu (podgląd szkicu przed wysłaniem). Licznik nadal rośnie tylko dla
--    statusu 'sent' + realnego wejścia klienta (p_track) z deduplikacją sesji.

create or replace function public.visualization_publish(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not (public.is_admin() or public.has_perm('visualizations_manage')) then
    raise exception 'Brak uprawnień do wizualizacji';
  end if;

  update public.visualizations
    set public_token = coalesce(public_token, encode(gen_random_bytes(32), 'hex')),
        status = 'sent',
        sent_at = coalesce(sent_at, now())
    where id = p_id
    returning public_token into v_token;

  if v_token is null then
    raise exception 'Nie znaleziono wizualizacji';
  end if;

  insert into public.activity_log (actor, action, entity, entity_id)
  values ((select auth.uid()), 'publish', 'visualization', p_id);

  return v_token;
end;
$$;

create or replace function public.visualization_ensure_token(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not (public.is_admin() or public.has_perm('visualizations_manage')) then
    raise exception 'Brak uprawnień do wizualizacji';
  end if;

  update public.visualizations
    set public_token = coalesce(public_token, encode(gen_random_bytes(32), 'hex'))
    where id = p_id
    returning public_token into v_token;

  if v_token is null then
    raise exception 'Nie znaleziono wizualizacji';
  end if;
  return v_token;
end;
$$;

create or replace function public.visualization_public(
  p_token text,
  p_track boolean default true,
  p_session text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.visualizations;
  v_points jsonb;
  v_branding jsonb;
  v_new_session boolean := false;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  -- Dowolny status (szkic można podejrzeć przez podgląd z aplikacji).
  select * into v from public.visualizations where public_token = p_token;
  if not found then
    return null;
  end if;

  -- Licznik: tylko wysłana wizualizacja, realne wejście klienta, raz na sesję.
  if p_track and v.status = 'sent'
     and p_session is not null and length(p_session) between 8 and 128 then
    insert into public.visualization_views (visualization_id, session_id)
    values (v.id, p_session)
    on conflict (visualization_id, session_id) do nothing;
    get diagnostics v_new_session = row_count;
    if v_new_session then
      update public.visualizations
        set view_count = view_count + 1,
            viewed_at = coalesce(viewed_at, now())
        where id = v.id;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'description', p.description,
      'requires_equipment', p.requires_equipment,
      'status', p.status,
      'before_path', p.before_path,
      'after_path', p.after_path
    ) order by p.created_at), '[]'::jsonb)
    into v_points
    from public.visualization_points p where p.visualization_id = v.id;

  select value into v_branding from public.settings where key = 'company_branding';

  return jsonb_build_object(
    'title', v.title,
    'address', v.address,
    'status', v.status,
    'latitude', v.latitude,
    'longitude', v.longitude,
    'bbox', jsonb_build_object(
      'north', v.bbox_north, 'south', v.bbox_south,
      'east', v.bbox_east, 'west', v.bbox_west
    ),
    'points', v_points,
    'branding', coalesce(v_branding, '{}'::jsonb)
  );
end;
$$;
