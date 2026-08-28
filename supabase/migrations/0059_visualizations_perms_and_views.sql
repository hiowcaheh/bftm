-- 0059 — Wizualizacje: uprawnienia punktów + okno licznika wyświetleń.
--
-- 1) Pracownik (visualizations_work) może EDYTOWAĆ każdy punkt (także cudzy).
--    Usuwać nadal może tylko własne (polityka delete bez zmian).
-- 2) Licznik: zamiast dedup „na zawsze" — okno 30 min. Ta sama sesja liczy się
--    ponownie po 30 minutach (realne powtórne wejście klienta), ale samo
--    odświeżenie w krótkim czasie nie nabija.

-- ── Punkty: UPDATE dla managera i pracownika (dowolny punkt) ──────────────────
drop policy if exists visualization_points_update on public.visualization_points;
create policy visualization_points_update on public.visualization_points
  for update to authenticated
  using (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or public.has_perm('visualizations_work')
  )
  with check (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or public.has_perm('visualizations_work')
  );

-- ── Licznik z oknem 30 min ────────────────────────────────────────────────────
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
  v_last timestamptz;
  v_count boolean := false;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  select * into v from public.visualizations where public_token = p_token;
  if not found then
    return null;
  end if;

  if p_track and v.status = 'sent'
     and p_session is not null and length(p_session) between 8 and 128 then
    select viewed_at into v_last
      from public.visualization_views
      where visualization_id = v.id and session_id = p_session;

    if v_last is null then
      insert into public.visualization_views (visualization_id, session_id)
      values (v.id, p_session)
      on conflict (visualization_id, session_id) do nothing;
      v_count := found;
    elsif now() - v_last > interval '30 minutes' then
      update public.visualization_views
        set viewed_at = now()
        where visualization_id = v.id and session_id = p_session;
      v_count := true;
    end if;

    if v_count then
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
