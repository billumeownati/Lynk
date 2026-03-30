const CACHE_NAME = 'lynk-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/Lynk.jpg',
  '/notification.mp3',
  '/meow.mp3'
];

// Install the service worker and cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Serve cached content when offline or for faster loading
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});