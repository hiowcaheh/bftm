/// <reference lib="webworker" />
// Własny service worker (strategia injectManifest) — precache + runtime cache
// jak dotąd (generateSW) plus obsługa Web Push i kliknięć w powiadomienia.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

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

self.addEventListener('push', (event) => {
  let data: PushPayload = { title: 'BFTM' };
  try {
    if (event.data) data = { ...data, ...(event.data.json() as PushPayload) };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    (async () => {
      if (typeof data.unread === 'number') {
        if (data.unread > 0) await swNavigator.setAppBadge?.(data.unread).catch(() => {});
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
