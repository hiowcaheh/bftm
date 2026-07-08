-- ============================================================================
-- 0001_init.sql — pełny schemat BFTM
-- Tabele, indeksy, funkcje pomocnicze, RLS, buckets Storage, seed settings.
-- Migracje są wyłącznie przyrostowe — tego pliku nie wolno później edytować.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELE
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('admin', 'employee')) default 'employee',
  permissions jsonb not null default '{}',
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employee_compensation (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  hourly_wage numeric(10, 2) not null check (hourly_wage >= 0),
  valid_from date not null,
  note text,
  created_at timestamptz not null default now()
);
create index employee_compensation_profile_idx
  on public.employee_compensation (profile_id, valid_from desc);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('private', 'company')) default 'company',
  org_or_person_nr text,
  email text,
  phone text,
  address text,
  reverse_vat boolean not null default false, -- omvänd byggmoms
  rot_eligible boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  status text not null
    check (status in ('offer', 'active', 'paused', 'completed', 'cancelled'))
    default 'active',
  address text,
  start_date date,
  end_date date,
  billing_type text not null
    check (billing_type in ('hourly', 'fixed', 'mixed')) default 'hourly',
  hourly_rate numeric(10, 2),   -- stawka fakturowana klientowi
  fixed_value numeric(12, 2),   -- wartość ryczałtu
  estimated_hours numeric(8, 2),
  description text,
  color text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index projects_status_idx on public.projects (status);
create index projects_client_idx on public.projects (client_id);

create table public.invoice_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  number text not null,
  period_from date not null,
  period_to date not null,
  total_hours numeric(10, 2) not null default 0,
  total_net numeric(12, 2) not null default 0,
  pdf_path text,
  note text,
  created_at timestamptz not null default now()
);
create index invoice_batches_project_idx on public.invoice_batches (project_id);

create table public.work_hours (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  employee_id uuid not null references public.profiles (id) on delete restrict,
  date date not null,
  hours numeric(5, 2) not null check (hours > 0 and hours <= 24),
  description text,
  status text not null
    check (status in ('draft', 'approved', 'invoiced')) default 'draft',
  invoice_batch_id uuid references public.invoice_batches (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index work_hours_project_date_idx on public.work_hours (project_id, date);
create index work_hours_employee_date_idx on public.work_hours (employee_id, date);
create index work_hours_status_idx on public.work_hours (status);

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  date_from date not null,
  date_to date not null check (date_to >= date_from),
  type text not null
    check (type in ('sick', 'vacation', 'unpaid', 'vab', 'other')),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index absences_employee_idx on public.absences (employee_id, date_from);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  description text not null,
  amount_net numeric(12, 2) not null default 0,
  vat_amount numeric(12, 2) not null default 0,
  amount_gross numeric(12, 2) not null default 0,
  category text not null
    check (category in ('materials', 'equipment', 'fuel', 'subcontractor', 'other')),
  date date not null,
  supplier text,
  receipt_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_project_idx on public.expenses (project_id);
create index expenses_date_idx on public.expenses (date);

create table public.additional_works (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  description text not null,
  value numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 25,
  date date,
  status text not null
    check (status in ('proposed', 'approved', 'rejected', 'invoiced'))
    default 'proposed',
  note text,
  created_at timestamptz not null default now()
);
create index additional_works_project_idx on public.additional_works (project_id);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid references public.clients (id) on delete set null,
  client_snapshot jsonb, -- kopia danych klienta z chwili wystawienia
  project_id uuid references public.projects (id) on delete set null,
  status text not null
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired'))
    default 'draft',
  issue_date date,
  valid_until date,
  reverse_vat boolean not null default false,
  rot_enabled boolean not null default false,
  rot_persons int not null default 1 check (rot_persons >= 1),
  notes text,
  terms text,
  created_at timestamptz not null default now()
);
create index offers_status_idx on public.offers (status);

create table public.offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  position int not null default 0,
  description text not null,
  unit text,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 25,
  is_labor boolean not null default false, -- pozycja robocizny = podstawa ROT
  created_at timestamptz not null default now()
);
create index offer_items_offer_idx on public.offer_items (offer_id, position);

create table public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  caption text,
  taken_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_photos_project_idx on public.project_photos (project_id);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}',
  is_public boolean not null default false,  -- czytelne także dla anon (branding, mapowanie loginu admin)
  admin_only boolean not null default false, -- czytelne tylko dla admina
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_entity_idx on public.activity_log (entity, entity_id);
create index activity_log_created_idx on public.activity_log (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. FUNKCJE POMOCNICZE (security definer — właściciel omija RLS, brak rekurencji)
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.has_perm(flag text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active
      and (role = 'admin' or coalesce((permissions ->> flag)::boolean, false))
  );
$$;

-- Konto aktywne? (dezaktywacja odcina dostęp niezależnie od ważnej sesji)
create or replace function public.is_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and active
  );
$$;

-- Trigger: pracownik nie może sam sobie zmienić roli, uprawnień, aktywności
-- ani e-maila — te pola zmienia wyłącznie admin (lub Edge Function z service_role).
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service_role (Edge Functions) — bez ograniczeń
  end if;
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.active is distinct from old.active
       or new.email is distinct from old.email then
      raise exception 'Brak uprawnień do zmiany tych pól profilu';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ----------------------------------------------------------------------------
-- 3. RLS — włączone na KAŻDEJ tabeli, bez wyjątków
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.employee_compensation enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.work_hours enable row level security;
alter table public.absences enable row level security;
alter table public.expenses enable row level security;
alter table public.additional_works enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.invoice_batches enable row level security;
alter table public.project_photos enable row level security;
alter table public.settings enable row level security;
alter table public.activity_log enable row level security;

-- profiles: każdy aktywny zalogowany widzi podstawowe profile (nazwiska w dzienniku
-- godzin); wrażliwe dane płacowe żyją w employee_compensation (tylko admin).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_active());

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());
-- insert/delete wyłącznie przez service_role (Edge Functions) — brak polityk.

-- employee_compensation: stawki widzi i zmienia tylko admin.
create policy employee_compensation_admin on public.employee_compensation
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- clients
create policy clients_select on public.clients
  for select to authenticated
  using (public.is_admin() or public.has_perm('clients_view'));
create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('clients_edit'));
create policy clients_update on public.clients
  for update to authenticated
  using (public.is_admin() or public.has_perm('clients_edit'))
  with check (public.is_admin() or public.has_perm('clients_edit'));
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin() or public.has_perm('clients_edit'));

-- projects: kolumny finansowe (hourly_rate, fixed_value) filtruje warstwa api.ts
-- wg finance_view; RLS decyduje o dostępie do wierszy.
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_admin() or public.has_perm('projects_view'));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('projects_edit'));
create policy projects_update on public.projects
  for update to authenticated
  using (public.is_admin() or public.has_perm('projects_edit'))
  with check (public.is_admin() or public.has_perm('projects_edit'));
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_admin());

-- work_hours
create policy work_hours_select on public.work_hours
  for select to authenticated
  using (
    public.is_admin()
    or public.has_perm('hours_view_all')
    or employee_id = auth.uid()
  );
create policy work_hours_insert on public.work_hours
  for insert to authenticated
  with check (
    public.is_admin()
    or public.has_perm('hours_edit_all')
    or (public.has_perm('hours_add_own') and employee_id = auth.uid())
  );
-- Wpisów 'invoiced' nie modyfikuje nikt poza adminem; własne szkice można poprawiać.
create policy work_hours_update on public.work_hours
  for update to authenticated
  using (
    public.is_admin()
    or (public.has_perm('hours_edit_all') and status <> 'invoiced')
    or (public.has_perm('hours_add_own') and employee_id = auth.uid() and status = 'draft')
  )
  with check (
    public.is_admin()
    or (public.has_perm('hours_edit_all') and status <> 'invoiced')
    or (public.has_perm('hours_add_own') and employee_id = auth.uid() and status = 'draft')
  );
create policy work_hours_delete on public.work_hours
  for delete to authenticated
  using (
    public.is_admin()
    or (public.has_perm('hours_edit_all') and status <> 'invoiced')
    or (public.has_perm('hours_add_own') and employee_id = auth.uid() and status = 'draft')
  );

-- absences: pracownik zgłasza i widzi swoje; absences_view_all/absences_manage — całość.
create policy absences_select on public.absences
  for select to authenticated
  using (
    public.is_admin()
    or public.has_perm('absences_view_all')
    or employee_id = auth.uid()
  );
create policy absences_insert on public.absences
  for insert to authenticated
  with check (
    public.is_admin()
    or public.has_perm('absences_manage')
    or employee_id = auth.uid()
  );
create policy absences_update on public.absences
  for update to authenticated
  using (
    public.is_admin()
    or public.has_perm('absences_manage')
    or (employee_id = auth.uid() and date_from >= current_date)
  )
  with check (
    public.is_admin()
    or public.has_perm('absences_manage')
    or employee_id = auth.uid()
  );
create policy absences_delete on public.absences
  for delete to authenticated
  using (
    public.is_admin()
    or public.has_perm('absences_manage')
    or (employee_id = auth.uid() and date_from >= current_date)
  );

-- expenses
create policy expenses_select on public.expenses
  for select to authenticated
  using (
    public.is_admin()
    or public.has_perm('expenses_view_all')
    or created_by = auth.uid()
  );
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('expenses_add'));
create policy expenses_update on public.expenses
  for update to authenticated
  using (
    public.is_admin()
    or (public.has_perm('expenses_add') and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.has_perm('expenses_add') and created_by = auth.uid())
  );
create policy expenses_delete on public.expenses
  for delete to authenticated
  using (
    public.is_admin()
    or (public.has_perm('expenses_add') and created_by = auth.uid())
  );

-- additional_works: wartości = finanse projektu → oglądają uprawnieni do ofert/projektów,
-- edytują edytorzy projektów; zafakturowanych nie zmienia nikt poza adminem.
create policy additional_works_select on public.additional_works
  for select to authenticated
  using (public.is_admin() or public.has_perm('projects_view'));
create policy additional_works_insert on public.additional_works
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('projects_edit'));
create policy additional_works_update on public.additional_works
  for update to authenticated
  using (
    public.is_admin()
    or (public.has_perm('projects_edit') and status <> 'invoiced')
  )
  with check (
    public.is_admin()
    or (public.has_perm('projects_edit') and status <> 'invoiced')
  );
create policy additional_works_delete on public.additional_works
  for delete to authenticated
  using (
    public.is_admin()
    or (public.has_perm('projects_edit') and status <> 'invoiced')
  );

-- offers + offer_items
create policy offers_select on public.offers
  for select to authenticated
  using (public.is_admin() or public.has_perm('offers_view'));
create policy offers_insert on public.offers
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('offers_edit'));
create policy offers_update on public.offers
  for update to authenticated
  using (public.is_admin() or public.has_perm('offers_edit'))
  with check (public.is_admin() or public.has_perm('offers_edit'));
create policy offers_delete on public.offers
  for delete to authenticated
  using (public.is_admin() or public.has_perm('offers_edit'));

create policy offer_items_select on public.offer_items
  for select to authenticated
  using (public.is_admin() or public.has_perm('offers_view'));
create policy offer_items_write on public.offer_items
  for all to authenticated
  using (public.is_admin() or public.has_perm('offers_edit'))
  with check (public.is_admin() or public.has_perm('offers_edit'));

-- invoice_batches: rozliczenia — wyłącznie admin.
create policy invoice_batches_admin on public.invoice_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- project_photos
create policy project_photos_select on public.project_photos
  for select to authenticated
  using (public.is_admin() or public.has_perm('projects_view'));
create policy project_photos_insert on public.project_photos
  for insert to authenticated
  with check (public.is_admin() or public.has_perm('photos_upload'));
create policy project_photos_delete on public.project_photos
  for delete to authenticated
  using (
    public.is_admin()
    or (public.has_perm('photos_upload') and created_by = auth.uid())
  );

-- settings: wiersze is_public (branding, mapowanie loginu admin) czyta także anon
-- — ekran logowania pokazuje logo i nazwę firmy PRZED zalogowaniem.
create policy settings_select_public on public.settings
  for select to anon
  using (is_public);
create policy settings_select_authenticated on public.settings
  for select to authenticated
  using (
    is_public
    or public.is_admin()
    or (public.is_active() and not admin_only)
  );
create policy settings_write_admin on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- activity_log: każdy aktywny użytkownik dopisuje, czyta tylko admin.
create policy activity_log_insert on public.activity_log
  for insert to authenticated
  with check (public.is_active() and actor = auth.uid());
create policy activity_log_select on public.activity_log
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. STORAGE — buckets i polityki
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),          -- logo firmy: publiczny odczyt (ekran logowania)
  ('receipts', 'receipts', false),   -- paragony: prywatne, signed URLs
  ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

create policy storage_logos_read on storage.objects
  for select using (bucket_id = 'logos');
create policy storage_logos_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and public.is_admin());
create policy storage_logos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and public.is_admin());
create policy storage_logos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and public.is_admin());

create policy storage_receipts_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (public.is_admin() or public.has_perm('expenses_view_all') or owner = auth.uid())
  );
create policy storage_receipts_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (public.is_admin() or public.has_perm('expenses_add'))
  );
create policy storage_receipts_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (public.is_admin() or owner = auth.uid()));

create policy storage_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-photos'
    and (public.is_admin() or public.has_perm('projects_view'))
  );
create policy storage_photos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-photos'
    and (public.is_admin() or public.has_perm('photos_upload'))
  );
create policy storage_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-photos'
    and (public.is_admin() or owner = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. SEED settings — wartości startowe (wszystko edytowalne w Ustawieniach)
-- ----------------------------------------------------------------------------

insert into public.settings (key, value, is_public, admin_only) values
  -- Branding: czytelny dla anon — ekran logowania przed zalogowaniem
  ('company_branding', '{"name": "", "logo_path": null}', true, false),
  -- Mapowanie loginu „admin" → e-mail administratora (ustawiane przez bootstrap-admin)
  ('admin_login', '{"email": null}', true, false),
  -- Pełne dane firmy do PDF (tylko zalogowani)
  ('company_details', '{
    "name": "", "address": "", "org_nr": "", "vat_nr": "",
    "f_skatt": true, "bankgiro": "", "plusgiro": "", "iban": "",
    "phone": "", "email": ""
  }', false, false),
  -- Parametry finansowe (Szwecja, stan 2026 — zweryfikowane, edytowalne)
  ('finance', '{
    "vat_default": 25,
    "vat_rates": [25, 12, 6, 0],
    "employer_fee_pct": 31.42,
    "vacation_pay_pct": 12,
    "overhead_pct": 0,
    "rot": {"enabled": true, "pct": 30, "cap_per_person": 50000}
  }', false, false),
  -- Feature flags — moduły i procesy włączane bez dotykania kodu
  ('features', '{
    "ai": false,
    "absences": true,
    "hours_approval": true
  }', false, false),
  ('offer_numbering', '{"prefix": "OF", "per_year": true, "next": 1, "year": null}', false, false),
  ('offer_defaults', '{"payment_terms_days": 30, "valid_days": 30, "terms": ""}', false, false),
  ('currency', '{"code": "SEK"}', false, false)
on conflict (key) do nothing;
