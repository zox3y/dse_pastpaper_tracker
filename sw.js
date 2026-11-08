/* Minimal service worker: offline shell plus cached CDN dependencies. */
const CACHE = 'dsetracker-v1';
const SHELL = [
  './',
  './index.html',
  './manifest-dark.json',
  './manifest-light.json',
  './icon.svg',
  './icon-maskable.svg',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  /* Navigations go network-first so a new build is picked up, with the shell as fallback. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
