-- 0004 — jeden wpis godzin dziennie na pracownika w danym projekcie.
-- Najpierw scalenie istniejących duplikatów (suma godzin w najstarszym wpisie),
-- potem unikalny indeks. Korekty robi się przez edycję wpisu.

with ranked as (
  select id, employee_id, project_id, date, hours,
         first_value(id) over w as keep_id,
         sum(hours) over (partition by employee_id, project_id, date) as total
  from public.work_hours
  window w as (partition by employee_id, project_id, date order by created_at)
)
update public.work_hours w
set hours = least(r.total, 24)
from ranked r
where w.id = r.keep_id and w.id = r.id and r.total <> w.hours;

delete from public.work_hours w
using (
  select id, first_value(id) over (partition by employee_id, project_id, date order by created_at) as keep_id
  from public.work_hours
) d
where w.id = d.id and d.id <> d.keep_id;

create unique index work_hours_one_per_day
  on public.work_hours (employee_id, project_id, date);
