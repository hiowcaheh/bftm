import { supabase } from '@/lib/supabaseClient';

/**
 * Web Push: subskrypcja urządzenia zapisywana w tabeli push_subscriptions.
 * Wysyłką zajmuje się trigger na notifications + Edge Function `push` (VAPID).
 * Klucz publiczny VAPID jest jawny z definicji — prywatny żyje tylko w bazie.
 */
const VAPID_PUBLIC_KEY =
  'BCk3AthWHFGE2aQrzKrEFEIVexOqJeLyxN69K2-GuJrDB0ENEWPCNNmyQaxiiarnUXV16DW3Wut6AKQtOKHXUqM';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

/** Czy TO urządzenie ma aktywną subskrypcję push. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await registration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Włącza push: zgoda → subskrypcja przeglądarki → zapis w bazie. */
export async function subscribePush(profileId: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission-denied');

  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('bad-subscription');
  }
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

/** Wyłącza push na tym urządzeniu (odsubskrybowanie + kasowanie wiersza). */
export async function unsubscribePush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
