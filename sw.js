// ══════════════════════════════════════════════════════════════════
// ACCESOS ROCK — Service Worker
// HTML: network-first  → la app se actualiza sola al publicar cambios
// Assets: cache-first   → arranca aunque el dispositivo esté sin red
// Apps Script: NUNCA se cachea
// ══════════════════════════════════════════════════════════════════
const CACHE  = 'accesos-rock-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Apps Script y fuentes: sin cache

  const esHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (esHTML) {
    // Network-first: siempre intenta traer la última versión publicada
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
  } else {
    // Cache-first: iconos, manifest, etc.
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return resp;
      }))
    );
  }
});
