---
name: bftm-migration
description: Use when changing the BFTM Supabase database (project ixositdqghamqeproryp) — new migration, RPC/SECURITY DEFINER function, RLS policy, trigger, grants, column — or when testing SQL that would modify production data, functions or auth tables.
---

# Migracje BFTM (Supabase)

## Plik
- `supabase/migrations/NNNN_opis.sql` — następny numer po ostatnim pliku; tylko przyrostowo.
- Nagłówek: `-- NNNN — co i DLACZEGO` (po polsku, zwięźle).
- Funkcję zmieniaj przez `create or replace` z pełnym ciałem z produkcji:
  `select pg_get_functiondef('public.fn(argtypes)'::regprocedure);` — nie z pamięci ani starych plików.

## Wzorce (obowiązkowe)
```sql
create or replace function public.x(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Ta operacja wymaga uprawnień administratora'; end if;
  ...
end; $$;
revoke execute on function public.x(uuid) from public, anon;
grant execute on function public.x(uuid) to authenticated;
```
- RLS: zawsze `(select auth.uid())`; UPDATE = `using` + `with check`.
- `alter table` na gorących tabelach (np. `profiles`): najpierw `set local lock_timeout = '5s';`.
- Pliki Storage usuwaj przez Storage API z frontu — `delete from storage.objects` blokuje trigger `protect_delete`.
- `auth.refresh_tokens.user_id` to varchar → `p_id::text`.
- Pracowników nie usuwamy — archiwum (`admin_archive_employee`, 0080).

## Bez poleceń usuwających w migracji
`apply_migration` / `execute_sql` z `DROP …` albo `DELETE`/`UPDATE` na `auth.*` w treści (także w ciele funkcji) czeka na potwierdzenie, które w aplikacji Mateusza się nie wyświetla — po 60 s timeout, nic się nie wykonuje. Projektuj migracje tak, żeby ich nie potrzebowały:
- zamiast `drop function` → `create or replace` z `raise exception` (blokada),
- zamiast własnych `delete from auth.sessions` → wywołaj istniejącą funkcję (np. `perform public.admin_set_active(id, false)`),
- zamiast zmiany funkcji z takimi poleceniami → mały trigger (np. `profiles_unarchive_on_activate`).
Jeśli usunięcia nie da się uniknąć: plik w repo + Mateusz uruchamia go w Supabase SQL Editor.

## Testowanie — nigdy nie zmieniaj produkcji przed zgodą
1. **Rollback na produkcji** (`execute_sql`) dla zmian bez DELETE/DROP na `auth.*`:
   ```sql
   begin; set local lock_timeout='3s'; set local statement_timeout='20s';
   <migracja>; <asercje>; select ...; rollback;
   ```
   Użytkownika symuluj: `select set_config('request.jwt.claims', json_build_object('sub','<uuid>')::text, true);` + `set local role authenticated;`. Po teście sprawdź, że nic nie zostało.
2. **Lokalny Postgres 16** w kontenerze, gdy `execute_sql` przekracza 60 s (bramka zatwierdzania przy DELETE/DROP — zapytanie nie dociera do bazy, `pg_stat_activity` pusty):
   ```bash
   su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/bftmtest/data -A trust -U postgres && /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/bftmtest/data -o '-p 54329 -k /var/lib/postgresql/bftmtest -c listen_addresses=' start"
   psql -h /var/lib/postgresql/bftmtest -p 54329 -U postgres
   ```
   Makieta: role anon/authenticated/service_role, schemat `auth` (users, sessions, refresh_tokens, `auth.uid()` z `request.jwt.claims`), potrzebne tabele + prawdziwe ciała funkcji z produkcji. Migrację uruchamiaj `psql -1 -f` (jedna transakcja jak `apply_migration`).
3. Funkcje z HTTP (`send_offer_email`, `lookup_company_by_orgnr`) — w teście podmień wysyłkę na `raise exception 'TEST'`; nigdy nie wysyłaj prawdziwych maili.

## Po zgodzie
`apply_migration` (nazwa = `NNNN_opis`) → `get_advisors` (security + performance) → dopisz zmiany do `src/types/database.ts` (ręcznie, kształt jak z gen types).

## Advisory świadomie ignorowane
`rls_enabled_no_policy` na `app_secrets` (celowo), `extension_in_public` pg_net (przenosiny psują pushe), publiczne RPC: `offer_public`, `offer_respond`, `report_share_public`, `visualization_public`, `unread_count_for_endpoint`; „unindexed FK / unused index” przy kilkuset wierszach.
