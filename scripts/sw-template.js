// Replaced by the Vite build plugin. No user data enters these caches.
const CACHE_NAME = '__CACHE_NAME__';
const PRECACHE = '__PRECACHE__';
const BASE = '__BASE__';
const urls = new Set(PRECACHE.map((path) => new URL(path, self.location.origin).href));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(`clock-calendar-${BASE}-`) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.pathname.startsWith(BASE)) {
    event.respondWith(
      (async () => {
        try {
          // Revalidate HTML on every online navigation; never trap a deployment behind a stale shell.
          const response = await fetch(request, { cache: 'no-cache' });
          if (response.ok) return response;
        } catch {
          /* Fall back to the completely installed shell. */
        }
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(`${BASE}index.html`)) ?? Response.error();
      })(),
    );
  } else if (urls.has(url.href)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        // These are our immutable, same-origin build files. Dev/preview CORS headers
        // may include Vary: Origin, while precache requests have no Origin header.
        return (await cache.match(request, { ignoreVary: true })) ?? fetch(request);
      })(),
    );
  }
});
