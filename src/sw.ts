/// <reference lib="webworker" />
// Własny service worker (strategia injectManifest) — precache + runtime cache
// jak dotąd (generateSW) plus obsługa Web Push i kliknięć w powiadomienia.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

// registerType 'prompt': aplikacja wysyła SKIP_WAITING po kliknięciu „Odśwież"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting();
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// Supabase REST (tylko GET) — najpierw sieć, offline fallback do cache
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/rest/') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-rest',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })],
  }),
);

// Avatary — ścieżki są niezmienne (nowe zdjęcie = nowy plik), więc cache-first:
// raz pobrane nie dotykają sieci; nowy URL po zmianie zdjęcia sam się dociąga
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/storage/v1/object/public/avatars/') &&
    request.method === 'GET',
  new CacheFirst({
    cacheName: 'avatars',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  }),
);

// Supabase Storage (logo, zdjęcia) — cache z cichym odświeżaniem
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/storage/') &&
    request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'supabase-storage',
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// ---------------------------------------------------------------------------
// Web Push: payload { title, body, type } wysyłany przez Edge Function `push`
// ---------------------------------------------------------------------------
interface PushPayload {
  title: string;
  body?: string;
  type?: string;
  unread?: number;
}

// Badging API w SW — liczba nieprzeczytanych na ikonce aplikacji
const swNavigator = self.navigator as Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

// Pushe potrafią dochodzić w złej kolejności, więc liczba z payloadu bywa
// nieświeża — przy każdym pushu pytamy bazę o AKTUALNY stan (klucz: endpoint
// własnej subskrypcji). Payloadowe `unread` zostaje jako fallback offline.
async function fetchUnreadCount(): Promise<number | null> {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return null;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/unread_count_for_endpoint`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ p_endpoint: sub.endpoint }),
      },
    );
    if (!res.ok) return null;
    const n: unknown = await res.json();
    return typeof n === 'number' ? n : null;
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  let data: PushPayload = { title: 'BFTM' };
  try {
    if (event.data) data = { ...data, ...(event.data.json() as PushPayload) };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    (async () => {
      const unread = (await fetchUnreadCount()) ?? data.unread;
      if (typeof unread === 'number') {
        if (unread > 0) await swNavigator.setAppBadge?.(unread).catch(() => {});
        else await swNavigator.clearAppBadge?.().catch(() => {});
      }
      await self.registration.showNotification(data.title, {
        body: data.body || undefined,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { type: data.type ?? 'info' },
      });
    })(),
  );
});

// Tap w powiadomienie → otwórz/odsłoń aplikację na właściwej zakładce
const TYPE_ROUTES: Record<string, string> = {
  payslip: '/#/wyplaty',
  hours_approved: '/#/godziny',
  offer_response: '/#/oferty',
  offer_viewed: '/#/oferty',
  absence: '/#/godziny',
  announcement: '/#/',
  hours_reminder: '/#/godziny',
  weekly_summary: '/#/',
  checklist: '/#/',
};

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const type = (event.notification.data as { type?: string } | undefined)?.type ?? 'info';
  const url = TYPE_ROUTES[type] ?? '/#/';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows[0];
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
