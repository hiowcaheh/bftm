/**
 * bootstrap-admin — jednorazowa konfiguracja pierwszego administratora.
 *
 * Działa TYLKO gdy w profiles nie istnieje żaden admin — potem zwraca 409.
 * Tworzy konto Auth z hasłem startowym „admin1" (polityka Supabase wymaga
 * min. 6 znaków), profil role='admin' z must_change_password=true oraz
 * zapisuje e-mail w settings.admin_login (mapowanie loginu „admin").
 */
import {
  adminClient,
  HttpError,
  json,
  readEnv,
  serveHandler,
} from '../_shared/admin.ts';

const START_PASSWORD = 'admin1';

serveHandler(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Tylko POST');

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'Podaj prawidłowy adres e-mail administratora');
  }

  const env = readEnv();
  const admin = adminClient(env);

  const { count, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (countError) throw new HttpError(500, 'Nie udało się sprawdzić profili');
  if ((count ?? 0) > 0) {
    throw new HttpError(409, 'Administrator już istnieje — konfiguracja wykonana wcześniej');
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: START_PASSWORD,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new HttpError(500, `Nie udało się utworzyć konta: ${createError?.message ?? ''}`);
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    full_name: 'Administrator',
    email,
    role: 'admin',
    permissions: {},
    active: true,
    must_change_password: true,
  });
  if (profileError) {
    // sprzątanie, żeby nieudany bootstrap dało się powtórzyć
    await admin.auth.admin.deleteUser(created.user.id);
    throw new HttpError(500, `Nie udało się utworzyć profilu: ${profileError.message}`);
  }

  await admin
    .from('settings')
    .update({ value: { email }, updated_at: new Date().toISOString() })
    .eq('key', 'admin_login');

  return json({ ok: true, startPassword: START_PASSWORD });
});
