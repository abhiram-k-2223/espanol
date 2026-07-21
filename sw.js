const CACHE = 'abhiram-v3';

const PRECACHE = [
  '.',
  'index.html',
  'app.js',
  'styles.css',
  'manifest.json',
  'lessons.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      return caches.open(CACHE).then(cache => {
        if (e.request.url.startsWith(self.location.origin)) cache.put(e.request, res.clone());
        return res;
      });
    }))
  );
});
