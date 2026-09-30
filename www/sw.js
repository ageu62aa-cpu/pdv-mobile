const CACHE_NAME = 'pdv-vs-v3';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/modules/auth/auth.html', // Adicionado para garantir a tela de login no cache
    '/modules/pdv/caixa-core.html'
];

// Instalação do Service Worker de forma robusta (não falha se um recurso oscilar)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`[Service Worker] Não foi possível colocar em cache: ${url}`, err);
                        });
                    })
                );
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

// Interceptação de requisições simplificada
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});