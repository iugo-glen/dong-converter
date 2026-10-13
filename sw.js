const CACHE = 'dong-v4';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page itself: try the network first (gives up after 3 seconds), fall back to the saved copy.
// Everything else: saved copy first.
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await Promise.race([
          fetch(e.request, { cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (res.ok) cache.put('index.html', res.clone());
        return res;
      } catch {
        return (await cache.match('index.html')) || (await cache.match('./'));
      }
    })());
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
