/* 16OC service worker — offline-first cache (iOS redirect-safe) */
const CACHE = 'concalc-v4';
const ASSETS = [
  './index.html',
  './css/styles.css',
  './js/units.js',
  './js/calc.js',
  './js/solvers.js',
  './js/qr.js',
  './js/app.js',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

/* iOS Safari rejects any navigation response with response.redirected === true
 * ("Response served by service worker has redirections"). Rebuild a clean,
 * non-redirected response before caching or serving. */
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload', redirect: 'follow' });
        if (res && res.ok) await cache.put(url, await clean(res));
      } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigations always get the clean cached document (no redirects, offline-safe)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      if (cached) return cached;
      try { return await clean(await fetch(req)); }
      catch (err) { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
    })());
    return;
  }

  // Other assets: cache-first, then network (cleaned + cached)
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await clean(await fetch(req));
      if (net && net.ok) { const cache = await caches.open(CACHE); cache.put(req, net.clone()); }
      return net;
    } catch (err) {
      return caches.match('./index.html');
    }
  })());
});
