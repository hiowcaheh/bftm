-- 0060 — Wizualizacje: znacznik wykonania punktu (kto/kiedy zmienił status).
-- Ustawiane triggerem, żeby nie dało się sfałszować z klienta.

alter table public.visualization_points
  add column done_at timestamptz,
  add column done_by uuid references public.profiles (id) on delete set null;

create or replace function public.viz_point_status_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.done_at := now();
      new.done_by := coalesce((select auth.uid()), new.created_by);
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'done' then
      new.done_at := now();
      new.done_by := (select auth.uid());
    else
      new.done_at := null;
      new.done_by := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists visualization_points_status_stamp on public.visualization_points;
create trigger visualization_points_status_stamp
  before insert or update on public.visualization_points
  for each row execute function public.viz_point_status_stamp();

-- Publiczny odczyt: dołóż done_at (klient widzi „kiedy zrobione").
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
      'after_path', p.after_path,
      'done_at', p.done_at
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
