-- Obecność pracowników + zmiana wyświetlanego e-maila właściciela.

-- „Ostatnio online": klient pinguje tę kolumnę co minutę i po powrocie do apki.
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- Właściciel prezentuje się firmowym adresem (login „admin" nadal działa
-- przez settings.admin_login — to zmienia tylko wyświetlany e-mail).
update public.profiles
  set email = 'mateus@bftm.se'
  where email = 'mateuszowca@gmail.com';
