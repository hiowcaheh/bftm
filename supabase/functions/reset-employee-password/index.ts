/**
 * reset-employee-password — reset hasła pracownika przez administratora
 * oraz dezaktywacja/reaktywacja konta (ban w Auth + flaga active w profiles).
 *
 * body.action: 'reset' (domyślnie) | 'deactivate' | 'reactivate'
 */
import {
  adminClient,
  HttpError,
  json,
  readEnv,
  requireAdmin,
  serveHandler,
} from '../_shared/admin.ts';

interface Body {
  profile_id?: string;
  action?: 'reset' | 'deactivate' | 'reactivate';
  temp_password?: string;
}

serveHandler(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Tylko POST');
  const env = readEnv();
  const adminId = await requireAdmin(req, env);

  const body = (await req.json().catch(() => ({}))) as Body;
  const { profile_id } = body;
  const action = body.action ?? 'reset';
  if (!profile_id) throw new HttpError(400, 'Brak identyfikatora pracownika');
  if (profile_id === adminId && action !== 'reset') {
    throw new HttpError(400, 'Nie można dezaktywować własnego konta');
  }

  const admin = adminClient(env);
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', profile_id)
    .single();
  if (!profile) throw new HttpError(404, 'Nie znaleziono pracownika');

  if (action === 'reset') {
    const password =
      body.temp_password && body.temp_password.length >= 6
        ? body.temp_password
        : crypto.randomUUID().slice(0, 10);
    const { error } = await admin.auth.admin.updateUserById(profile_id, { password });
    if (error) throw new HttpError(500, `Nie udało się zresetować hasła: ${error.message}`);
    await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', profile_id);
    return json({ ok: true, tempPassword: password });
  }

  if (action === 'deactivate') {
    // ban w Auth odcina logowanie; flaga active odcina RLS mimo ważnej sesji
    const { error } = await admin.auth.admin.updateUserById(profile_id, {
      ban_duration: '87600h', // ~10 lat
    });
    if (error) throw new HttpError(500, `Nie udało się zablokować konta: ${error.message}`);
    await admin.from('profiles').update({ active: false }).eq('id', profile_id);
    return json({ ok: true });
  }

  // reactivate
  const { error } = await admin.auth.admin.updateUserById(profile_id, {
    ban_duration: 'none',
  });
  if (error) throw new HttpError(500, `Nie udało się odblokować konta: ${error.message}`);
  await admin.from('profiles').update({ active: true }).eq('id', profile_id);
  return json({ ok: true });
});
