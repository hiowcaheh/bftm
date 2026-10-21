-- 0071 — „kto edytował" przy wpisach godzin: updated_by / updated_at
-- (created_by = kto DODAŁ, nie zmienia się — patrz 0072).
alter table public.work_hours
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz;
