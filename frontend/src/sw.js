// Service Worker: кэширование (Workbox) + push-уведомления с логами
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
cleanupOutdatedCaches();

// Precache (заполняется при сборке)
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA-роутинг
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// API — NetworkFirst
registerRoute(
  /^https:\/\/.*\.onrender\.com\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })]
  }),
  'GET'
);

// Push-уведомления с логами
self.addEventListener('push', event => {
  console.log('[SW] push event received');
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log('[SW] payload =', JSON.stringify(data));
  } catch (e) {
    console.error('[SW] payload parse error:', e.message);
    data = { title: 'Moje Media', body: 'Nowe powiadomienie' };
  }
  const title = data.title || 'Moje Media';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'moje-media',
    data: { url: '/' }
  };
  console.log('[SW] showNotification called:', title);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] notificationclick');
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
