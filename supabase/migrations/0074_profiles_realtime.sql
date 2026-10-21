-- 0074 — zmiana uprawnień działa od razu: klient subskrybuje SWÓJ wiersz profiles
-- (filtr id=eq.<uid>, RLS) i odświeża profil, gdy zmienią się flagi/rola/aktywność.
alter publication supabase_realtime add table public.profiles;
