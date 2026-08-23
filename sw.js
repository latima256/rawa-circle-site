// Minimal service worker for the Raw Circle Admin PWA.
// Just enough for the browser to consider the admin page "installable" on
// Android/iOS, plus a light offline fallback for the app shell itself.
// Deliberately does NOT cache Supabase API responses — prices and site
// copy should always come in fresh, never from a stale cache.

const CACHE_NAME = 'rc-admin-shell-v1';
const PRECACHE_URLS = [
  '/admin.html',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept calls to Supabase (auth, database, storage) — those
  // must always hit the network live.
  if (url.hostname.endsWith('supabase.co')) return;

  // Network-first for the app shell: admins should see the latest code,
  // but if there's no connection, fall back to whatever was cached.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
