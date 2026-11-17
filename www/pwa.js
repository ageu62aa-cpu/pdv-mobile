(() => {
    let installPrompt = null;
    let serviceWorkerRegistration = null;
    let waitingServiceWorker = null;
    let updateAvailable = false;
    let updatingApp = false;
    let reloadAfterUpdate = false;
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    function isStandalone() {
        return standaloneQuery.matches || window.navigator.standalone === true;
    }

    function showInstallInstructions() {
        const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
            || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
        const isAndroid = /android/i.test(window.navigator.userAgent);
        const instructions = isAppleMobile
            ? 'Para instalar no iPhone ou iPad, toque em Compartilhar no Safari e escolha “Adicionar à Tela de Início”.'
            : isAndroid
                ? 'Para instalar, abra o menu ⋮ do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.'
                : 'Para instalar, use a opção “Instalar PDV-VS” ou “Instalar este site como aplicativo” no menu do navegador.';
        window.alert(instructions);
    }

    function updateButton(button) {
        button.hidden = isStandalone() && !updateAvailable;
        const adminAction = button.closest('#adminHeaderActions');
        const updatingLabel = updatingApp ? 'Atualizando app...' : 'Atualizar app';
        button.title = updateAvailable
            ? updatingApp ? 'Atualizando o aplicativo PDV-VS' : 'Nova versão disponível. Atualizar aplicativo'
            : 'Instalar o aplicativo PDV-VS';
        button.setAttribute('aria-label', button.title);
        if (adminAction) {
            button.style.removeProperty('width');
            button.style.removeProperty('height');
            button.style.removeProperty('padding');
            button.style.removeProperty('max-width');
            button.style.removeProperty('max-height');
            button.className = updateAvailable
                ? 'flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-700 bg-amber-950/50 px-3 text-amber-200 shadow-sm transition hover:border-amber-500 hover:bg-amber-900/60'
                : 'flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 text-emerald-200 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-900/60';
            button.innerHTML = updateAvailable
                ? `<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M4.9 9a7.5 7.5 0 0 1 12.4-2L20 12M4 17v-5h5"/><path d="M19.1 15a7.5 7.5 0 0 1-12.4 2L4 12"/></svg><span class="action-label text-xs font-semibold">${updatingLabel}</span>`
                : '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11m-4-4 4 4 4-4"/><path d="M5 17v3h14v-3"/></svg><span class="action-label text-xs font-semibold">Instalar app</span>';
            return;
        }

        if (updateAvailable) {
            button.className = 'rounded-lg border border-amber-500 bg-amber-600 text-white shadow transition hover:bg-amber-500';
            button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M4.9 9a7.5 7.5 0 0 1 12.4-2L20 12M4 17v-5h5"/><path d="M19.1 15a7.5 7.5 0 0 1-12.4 2L4 12"/></svg>';
            return;
        }

        button.className = 'rounded-lg border border-emerald-500 bg-emerald-600 text-white shadow transition hover:bg-emerald-500';
        button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/></svg>';
    }

    function setUpdateAvailable(worker) {
        waitingServiceWorker = worker;
        updateAvailable = Boolean(worker);
        const button = document.getElementById('btnPWAAction');
        if (button) updateButton(button);
    }

    function checkForUpdates() {
        if (!serviceWorkerRegistration || document.visibilityState === 'hidden') return;
        serviceWorkerRegistration.update().catch(error => {
            console.error('[PWA] Não foi possível verificar atualizações:', error);
        });
    }

    function monitorServiceWorker(registration) {
        serviceWorkerRegistration = registration;
        if (registration.waiting) setUpdateAvailable(registration.waiting);

        registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;
            installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    setUpdateAvailable(registration.waiting || installingWorker);
                }
            });
        });

        checkForUpdates();
        window.setInterval(checkForUpdates, 5 * 60 * 1000);
    }

    function applyUpdate(button) {
        if (!waitingServiceWorker || updatingApp) return;
        if (!window.confirm('Uma nova versão do aplicativo está disponível. Atualizar e recarregar o PDV agora?')) return;

        updatingApp = true;
        reloadAfterUpdate = true;
        button.disabled = true;
        updateButton(button);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!reloadAfterUpdate) return;
            reloadAfterUpdate = false;
            window.location.reload();
        }, { once: true });

        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        window.setTimeout(() => {
            if (!reloadAfterUpdate) return;
            reloadAfterUpdate = false;
            updatingApp = false;
            button.disabled = false;
            console.error('[PWA] O service worker não ativou a atualização solicitada.');
            updateButton(button);
            window.alert('Não foi possível aplicar a atualização agora. Tente novamente.');
        }, 15000);
    }

    function createInstallButton() {
        let button = document.getElementById('btnPWAAction');
        let adminAction = false;
        if (button) {
            button.style.display = 'inline-flex';
            button.type = 'button';
        } else {
            button = document.createElement('button');
            button.id = 'btnPWAAction';
            button.type = 'button';
            button.style.cssText = [
                'display:inline-flex',
                'align-items:center',
                'justify-content:center',
                'width:2.25rem',
                'height:2.25rem',
                'padding:0',
                'border:1px solid #059669',
                'border-radius:0.5rem',
                'background:#047857',
                'color:#fff',
                'cursor:pointer',
                'flex:0 0 auto'
            ].join(';');

            const header = document.querySelector('header');
            const actionGroup = header?.lastElementChild;
            if (actionGroup instanceof HTMLElement && actionGroup !== header.firstElementChild) {
                adminAction = actionGroup.id === 'adminHeaderActions';
                actionGroup.prepend(button);
            } else if (header) {
                header.append(button);
            } else {
                button.style.position = 'fixed';
                button.style.top = '1rem';
                button.style.right = '1rem';
                button.style.zIndex = '1000';
                document.body.append(button);
            }
        }

        adminAction ||= button.closest('#adminHeaderActions') !== null;
        if (!adminAction) {
            button.style.maxWidth = '2.25rem';
            button.style.maxHeight = '2.25rem';
            button.style.padding = '0';
            button.style.gap = '0';
            button.style.fontSize = '0';
            button.style.lineHeight = '1';
        }

        updateButton(button);
        button.addEventListener('click', async () => {
            if (updateAvailable) {
                applyUpdate(button);
                return;
            }
            if (!installPrompt) {
                showInstallInstructions();
                return;
            }

            try {
                installPrompt.prompt();
                await installPrompt.userChoice;
                installPrompt = null;
            } catch (error) {
                console.error('[PWA] Não foi possível abrir o diálogo de instalação:', error);
                installPrompt = null;
                showInstallInstructions();
            }
        });
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        const manifest = document.querySelector('link[rel="manifest"]');
        const serviceWorkerUrl = manifest
            ? new URL('sw.js', manifest.href)
            : new URL('/sw.js', window.location.origin);
        navigator.serviceWorker.register(serviceWorkerUrl.href, { updateViaCache: 'none' })
            .then(monitorServiceWorker)
            .catch(error => console.error('[PWA] Falha ao registrar o service worker:', error));
    }

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
        const button = document.getElementById('btnPWAAction');
        if (button) updateButton(button);
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        const button = document.getElementById('btnPWAAction');
        if (button) updateButton(button);
    });

    standaloneQuery.addEventListener?.('change', () => {
        const button = document.getElementById('btnPWAAction');
        if (button) updateButton(button);
    });
    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', checkForUpdates);

    window.instalarPwaApp = () => {
        document.getElementById('btnPWAAction')?.click();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createInstallButton();
            registerServiceWorker();
        }, { once: true });
    } else {
        createInstallButton();
        registerServiceWorker();
    }
})();
