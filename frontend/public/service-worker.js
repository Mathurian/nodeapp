/**
 * Legacy service-worker compatibility shim.
 *
 * The application now registers VitePWA's generated `/sw.js`.
 * If an older client still requests `/service-worker.js`, this shim
 * self-unregisters and clears known app caches so the current app
 * can register the canonical service worker on next page load.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheKeys = await caches.keys();
      const knownPrefixes = ['workbox-', 'event-manager-', 'api-cache', 'image-cache'];
      await Promise.all(
        cacheKeys
          .filter((key) => knownPrefixes.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key))
      );
    } finally {
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(clients.map((client) => client.navigate(client.url)));
    }
  })());
});
