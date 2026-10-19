const CACHE_NAME = 'pdv-vs-v42';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa.js',
    '/assets/pwa-192.png',
    '/assets/pwa-512.png',
    '/modules/auth/auth.html', // Adicionado para garantir a tela de login no cache
    '/modules/auth/auth.js',
    '/modules/pdv/caixa-core.html',
    '/modules/pdv/operador.html',
    '/modules/pdv/caixa-core.js',
    '/modules/admin/admin.html',
    '/modules/admin/admin-core.js',
    '/modules/admin/admin-produtos.js',
    '/modules/admin/admin-operadores.js',
    '/modules/admin/admin-maquininhas.js',
    '/modules/admin/admin-historico.js',
    '/modules/admin/admin-planos.js',
    '/modules/admin/admin-upgrade.js',
    '/termos.html',
    '/camera.js',
    '/core/config.js',
    '/core/perfilEmpresa.js',
    '/core/sessaoService.js',
    '/core/termosModal.js',
    '/core/state.js',
    '/services/produtos.js'
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