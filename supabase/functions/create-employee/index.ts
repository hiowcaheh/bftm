/**
 * create-employee — założenie konta pracownika przez administratora.
 *
 * Weryfikuje JWT wywołującego (musi być aktywnym adminem wg profiles),
 * tworzy konto Auth (email_confirm: true), profil oraz pierwszy wpis
 * w employee_compensation. Hasło tymczasowe wraca do UI JEDEN raz.
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
  full_name?: string;
  email?: string;
  phone?: string;
  hourly_wage?: number;
  valid_from?: string;
  temp_password?: string;
  permissions?: Record<string, boolean>;
}

serveHandler(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Tylko POST');
  const env = readEnv();
  await requireAdmin(req, env);

  const body = (await req.json().catch(() => ({}))) as Body;
  const { full_name, email, phone, hourly_wage, valid_from, permissions } = body;

  if (!full_name?.trim()) throw new HttpError(400, 'Podaj imię i nazwisko');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'Podaj prawidłowy adres e-mail');
  }
  const password =
    body.temp_password && body.temp_password.length >= 6
      ? body.temp_password
      : crypto.randomUUID().slice(0, 10);

  const admin = adminClient(env);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new HttpError(
      createError?.message.includes('already') ? 409 : 500,
      createError?.message.includes('already')
        ? 'Konto z tym adresem e-mail już istnieje'
        : `Nie udało się utworzyć konta: ${createError?.message ?? ''}`,
    );
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    full_name: full_name.trim(),
    email,
    phone: phone ?? null,
    role: 'employee',
    permissions: permissions ?? { hours_add_own: true, projects_view: true },
    active: true,
    must_change_password: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new HttpError(500, `Nie udało się utworzyć profilu: ${profileError.message}`);
  }

  if (typeof hourly_wage === 'number' && hourly_wage >= 0) {
    const { error: compError } = await admin.from('employee_compensation').insert({
      profile_id: created.user.id,
      hourly_wage,
      valid_from: valid_from ?? new Date().toISOString().slice(0, 10),
    });
    if (compError) {
      console.error('Nie zapisano stawki:', compError.message);
    }
  }

  return json({ ok: true, id: created.user.id, tempPassword: password });
});
