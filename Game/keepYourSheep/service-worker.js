// En tu service-worker.js o workbox-config
const CACHE_NAME = 'geekwave-game-v1';
const urlsToCache = [
  '/',
  './index.html',
  './manifest.json',
  './css/index.css',
  // No cachees los assets dinámicamente, déjalo a Workbox
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Estrategia network-first para assets
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/assets/') || 
      event.request.url.includes('/dist/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});