const CACHE_NAME = 'pdv-vs-v77';
const themePreferenceCacheName = 'pdv-brand-theme-preference-v3';
const themePreferenceRequestUrl = '/__vancely_brand_theme_preference__';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/manifest-yellow.json',
    '/manifest-pink.json',
    '/manifest-orange.json',
    '/manifest-purple.json',
    '/manifest-coffee.json',
    '/manifest-black-gold.json',
    '/manifest-blue-ice.json',
    '/manifest-red.json',
    '/pwa.js',
    '/assets/pwa-192.png',
    '/assets/pwa-512.png',
    '/assets/icones-card.jpeg',
    '/assets/icone-carde.png',
    '/assets/icone-carde-black-gold.jpeg',
    '/assets/icone-carde-azul-branco Gelo1.jpeg',
    '/assets/image.png',
    '/assets/mascote-verde.png',
    '/assets/mascote-amarelo.png',
    '/assets/mascote-rosa.png',
    '/assets/mascote-laranja.png',
    '/assets/mascote-roxo.png',
    '/assets/mascote-black-gold.png',
    '/assets/mascote-azul-branco-gelo.png',
    '/assets/mascote-vermelho.png',
    '/assets/theme-icons/green.png',
    '/assets/theme-icons/yellow.png',
    '/assets/theme-icons/pink.png',
    '/assets/theme-icons/orange.png',
    '/assets/theme-icons/purple.png',
    '/assets/theme-icons/coffee.png',
    '/assets/theme-icons/black-gold.png',
    '/assets/theme-icons/blue-ice.png',
    '/assets/theme-icons/red.png',
    '/modules/auth/auth.html', // Adicionado para garantir a tela de login no cache
    '/modules/auth/auth.js',
    '/modules/auth/update-password.html',
    '/modules/pdv/caixa-core.html',
    '/modules/pdv/operador.html',
    '/modules/pdv/caixa-core.js',
    '/modules/pdv/caixa-operacoes.js',
    '/modules/pdv/caixa-vendas.js',
    '/modules/pdv/caixa-busca.js',
    '/modules/pdv/components/modalCheckout.js',
    '/modules/pdv/components/modalProduto.js',
    '/modules/admin/admin.html',
    '/modules/admin/admin-core.js',
    '/modules/admin/admin.js',
    '/modules/admin/admin-produtos.js',
    '/modules/admin/admin-operadores.js',
    '/modules/admin/admin-maquininhas.js',
    '/modules/admin/admin-historico.js',
    '/modules/admin/admin-planos.js',
    '/modules/admin/admin-upgrade.js',
    '/modules/admin/components/modalAdmin.js',
    '/modules/super-admin.html',
    '/modules/super-admin/components/super-admin.js',
    '/modules/super-admin/components/modalSuperAdmin.js',
    '/termos.html',
    '/camera.js',
    '/core/config.js',
    '/core/brandThemeBootstrap.js',
    '/core/brandTheme.js',
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
        (async () => {
            const themeCache = await caches.open(themePreferenceCacheName);
            const themeRequest = new Request(new URL(themePreferenceRequestUrl, self.location.origin));
            if (!await themeCache.match(themeRequest)) {
                const previousThemeCache = await caches.open('pdv-brand-theme-preference-v2');
                const previousTheme = await previousThemeCache.match(themeRequest);
                if (previousTheme) await themeCache.put(themeRequest, previousTheme);
            }

            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => {
                if (cacheName.startsWith('pdv-vs-') && cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                }
                if (cacheName.startsWith('pdv-brand-theme-preference-') && cacheName !== themePreferenceCacheName) {
                    return caches.delete(cacheName);
                }
                return Promise.resolve();
            }));
            await self.clients.claim();
        })()
    );
});

// Interceptação de requisições simplificada
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

    if (requestUrl.pathname === themePreferenceRequestUrl) {
        event.respondWith(
            caches.open(themePreferenceCacheName)
                .then(cache => cache.match(requestUrl))
                .then(response => {
                    if (response) return response;
                    return new Response(JSON.stringify({ theme: 'green' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        const cacheableDestination = ['document', 'script', 'style', 'image', 'font'].includes(event.request.destination);
        if (cacheableDestination && response.ok) {
            event.waitUntil(cache.put(event.request, response.clone()).catch(error => {
                console.warn(`[Service Worker] Não foi possível guardar em cache: ${requestUrl.pathname}`, error);
            }));
        }
        return response;
    })());
});