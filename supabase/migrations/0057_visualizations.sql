-- 0057 — Moduł „Wizualizacje": mapa z punktami pracy dla klienta.
-- Wzorzec 1:1 z ofertami: publiczny dostęp klienta WYŁĄCZNIE przez RPC
-- security definer po niezgadywalnym tokenie (32 bajty hex). Anon nie czyta tabel.
--
-- Uprawnienia:
--   visualizations_manage — pełny CRUD + wysyłka do klienta.
--   visualizations_work   — praca na mapie; usuwa TYLKO własne punkty.
-- Ochrona „własnych punktów" egzekwowana w RLS (created_by = auth.uid()),
-- nie tylko w UI.

-- ── Tabele ───────────────────────────────────────────────────────────────────

create table public.visualizations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  title text,
  address text,
  latitude double precision,
  longitude double precision,
  -- obszar (bounding box) wyznaczony dwoma narożnikami
  bbox_north double precision,
  bbox_south double precision,
  bbox_east double precision,
  bbox_west double precision,
  status text not null
    check (status in ('draft', 'sent'))
    default 'draft',
  public_token text unique,
  view_count int not null default 0,
  viewed_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visualizations_status_idx on public.visualizations (status);
create index visualizations_client_idx on public.visualizations (client_id);
create index visualizations_created_by_idx on public.visualizations (created_by);

create table public.visualization_points (
  id uuid primary key default gen_random_uuid(),
  visualization_id uuid not null
    references public.visualizations (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  description text not null default '',
  requires_equipment boolean not null default false,
  status text not null
    check (status in ('todo', 'done'))
    default 'todo',
  before_path text,  -- zdjęcie „przed" (bucket visualization-photos)
  after_path text,   -- zdjęcie „po" — struktura gotowa, UI opcjonalne
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visualization_points_viz_idx
  on public.visualization_points (visualization_id);
create index visualization_points_created_by_idx
  on public.visualization_points (created_by);

-- Deduplikacja licznika: jedna sesja publiczna liczy się raz na wizualizację.
create table public.visualization_views (
  id uuid primary key default gen_random_uuid(),
  visualization_id uuid not null
    references public.visualizations (id) on delete cascade,
  session_id text not null,
  viewed_at timestamptz not null default now(),
  unique (visualization_id, session_id)
);

-- ── updated_at (dotknięcie przy każdym UPDATE) ───────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger visualizations_touch
  before update on public.visualizations
  for each row execute function public.touch_updated_at();
create trigger visualization_points_touch
  before update on public.visualization_points
  for each row execute function public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.visualizations enable row level security;
alter table public.visualization_points enable row level security;
alter table public.visualization_views enable row level security;

-- Wizualizacje: odczyt/zapis dla manage/work; usunięcie i zmiana ustawień tylko manage.
create policy visualizations_select on public.visualizations
  for select to authenticated
  using (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or public.has_perm('visualizations_work')
  );
create policy visualizations_insert on public.visualizations
  for insert to authenticated
  with check (
    public.is_admin() or public.has_perm('visualizations_manage')
  );
create policy visualizations_update on public.visualizations
  for update to authenticated
  using (public.is_admin() or public.has_perm('visualizations_manage'))
  with check (public.is_admin() or public.has_perm('visualizations_manage'));
create policy visualizations_delete on public.visualizations
  for delete to authenticated
  using (public.is_admin() or public.has_perm('visualizations_manage'));

-- Punkty: odczyt dla manage/work. INSERT dla manage/work.
-- UPDATE: manage dowolny; work tylko swój.
-- DELETE: manage dowolny; work tylko swój (egzekwowane backendowo).
create policy visualization_points_select on public.visualization_points
  for select to authenticated
  using (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or public.has_perm('visualizations_work')
  );
create policy visualization_points_insert on public.visualization_points
  for insert to authenticated
  with check (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or (public.has_perm('visualizations_work') and created_by = (select auth.uid()))
  );
create policy visualization_points_update on public.visualization_points
  for update to authenticated
  using (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or (public.has_perm('visualizations_work') and created_by = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or (public.has_perm('visualizations_work') and created_by = (select auth.uid()))
  );
create policy visualization_points_delete on public.visualization_points
  for delete to authenticated
  using (
    public.is_admin()
    or public.has_perm('visualizations_manage')
    or (public.has_perm('visualizations_work') and created_by = (select auth.uid()))
  );

-- visualization_views: zapis wyłącznie przez RPC security definer; brak dostępu klienta.
create policy visualization_views_select on public.visualization_views
  for select to authenticated
  using (public.is_admin() or public.has_perm('visualizations_manage'));

-- ── Storage: bucket na zdjęcia punktów ───────────────────────────────────────
-- Publiczny odczyt (klient bez logowania widzi zdjęcia przez public URL),
-- ścieżki losowe/niezgadywalne. Zapis tylko dla uprawnionych pracowników.

insert into storage.buckets (id, name, public)
values ('visualization-photos', 'visualization-photos', true)
on conflict (id) do nothing;

create policy storage_viz_read on storage.objects
  for select using (bucket_id = 'visualization-photos');
create policy storage_viz_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visualization-photos'
    and (
      public.is_admin()
      or public.has_perm('visualizations_manage')
      or public.has_perm('visualizations_work')
    )
  );
create policy storage_viz_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'visualization-photos'
    and (
      public.is_admin()
      or public.has_perm('visualizations_manage')
      or owner = (select auth.uid())
    )
  );

-- ── Publikacja: nadaje token (raz), status sent ──────────────────────────────

create or replace function public.visualization_publish(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
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

-- Token dla szkicu (podgląd przed wysłaniem — status zostaje draft).
create or replace function public.visualization_ensure_token(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
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

-- ── Publiczny odczyt po tokenie (anon): wizualizacja + punkty ─────────────────
-- p_track=false (podgląd z aplikacji) NIE liczy wyświetlenia.
-- p_track=true + p_session: liczy raz na sesję (deduplikacja).

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

  select * into v from public.visualizations
    where public_token = p_token and status = 'sent';
  if not found then
    return null;
  end if;

  -- Licznik: tylko publiczne wejście klienta i tylko raz na sesję.
  if p_track and p_session is not null and length(p_session) between 8 and 128 then
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

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke execute on function public.visualization_publish(uuid) from public, anon;
grant execute on function public.visualization_publish(uuid) to authenticated;
revoke execute on function public.visualization_ensure_token(uuid) from public, anon;
grant execute on function public.visualization_ensure_token(uuid) to authenticated;
-- Publiczny odczyt: anon + authenticated (klient bez logowania).
grant execute on function public.visualization_public(text, boolean, text)
  to anon, authenticated;
