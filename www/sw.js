const CACHE_NAME = 'pdv-vs-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/modules/pdv/caixa-core.html'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptação de requisições (Cache First com fallback para rede e cache dinâmico de CDNs)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    // Fallback caso esteja offline
                    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/modules/pdv/caixa-core.html');
                    }
                });
            })
    );
});