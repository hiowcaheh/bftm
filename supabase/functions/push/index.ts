// Edge Function `push` — wysyła Web Push (VAPID) na wszystkie urządzenia
// odbiorcy. Wywoływana przez trigger notifications_push (pg_net) z sekretem
// w nagłówku x-push-secret; verify_jwt wyłączone, bo autoryzuje sekret.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

let vapidReady: Promise<void> | null = null;
let fnSecret = '';

async function initVapid() {
  const { data, error } = await supabase
    .from('app_secrets')
    .select('key, value')
    .in('key', ['vapid_public_key', 'vapid_private_key', 'vapid_subject', 'push_fn_secret']);
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  fnSecret = map.push_fn_secret ?? '';
  webpush.setVapidDetails(
    map.vapid_subject ?? 'mailto:mateus@bftm.se',
    map.vapid_public_key,
    map.vapid_private_key,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  vapidReady ??= initVapid();
  await vapidReady;

  if (!fnSecret || req.headers.get('x-push-secret') !== fnSecret) {
    return new Response('unauthorized', { status: 401 });
  }

  const { recipient_id, title, body, type, unread } = await req.json();
  if (!recipient_id || !title) return new Response('bad request', { status: 400 });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', recipient_id);
  if (error) return new Response(error.message, { status: 500 });

  // unread → badge (kółeczko z liczbą) na ikonce aplikacji
  const payload = JSON.stringify({
    title,
    body: body ?? '',
    type: type ?? 'info',
    unread: typeof unread === 'number' ? unread : undefined,
  });
  let sent = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 = subskrypcja martwa (odinstalowana PWA itp.) — sprzątamy
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }),
  );

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
