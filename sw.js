const CACHE_NAME = 'shell-pos-v2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './logo.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Devuelve el archivo desde la caché, o lo busca en internet si no está
            return response || fetch(event.request);
        })
    );
});