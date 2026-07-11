-- 0019 — Specyfikacje wypłaty (lönespec): admin wgrywa PDF/zdjęcie per
-- pracownik i miesiąc; pracownik widzi tylko swoje. Prywatny bucket
-- (signed URLs). Powiadomienie wysyłane z klienta po wgraniu.

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  month int not null check (month between 1 and 12),
  file_path text not null,
  file_type text not null default 'application/pdf',
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (employee_id, year, month)
);
create index payslips_employee_idx on public.payslips (employee_id, year desc, month desc);

alter table public.payslips enable row level security;

-- Pracownik widzi swoje; admin wszystkie
create policy payslips_select on public.payslips
  for select to authenticated
  using (public.is_admin() or employee_id = auth.uid());

-- Wgrywa/edytuje/usuwa wyłącznie admin (płace)
create policy payslips_admin_write on public.payslips
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Prywatny bucket na pliki lönespec
insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

-- Odczyt pliku: admin lub właściciel (ścieżka zaczyna się od jego uuid)
create policy storage_payslips_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payslips'
    and (public.is_admin() or split_part(name, '/', 1) = auth.uid()::text)
  );

create policy storage_payslips_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payslips' and public.is_admin());

create policy storage_payslips_update on storage.objects
  for update to authenticated
  using (bucket_id = 'payslips' and public.is_admin())
  with check (bucket_id = 'payslips' and public.is_admin());

create policy storage_payslips_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'payslips' and public.is_admin());
