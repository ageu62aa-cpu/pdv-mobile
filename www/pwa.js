(() => {
    let installPrompt = null;
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
        if (isStandalone()) {
            button.innerHTML = '<span aria-hidden="true">✓</span><span>App aberto</span>';
            button.setAttribute('aria-label', 'O aplicativo PDV-VS já está aberto');
            return;
        }

        button.innerHTML = '<span aria-hidden="true">⇩</span><span>Instalar / Abrir App</span>';
        button.setAttribute('aria-label', 'Instalar o aplicativo PDV-VS');
    }

    function createInstallButton() {
        let button = document.getElementById('btnPWAAction');
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
                'gap:0.5rem',
                'padding:0.5rem 0.75rem',
                'border:1px solid #059669',
                'border-radius:0.5rem',
                'background:#047857',
                'color:#fff',
                'font:600 0.75rem system-ui,sans-serif',
                'cursor:pointer',
                'white-space:nowrap'
            ].join(';');

            const header = document.querySelector('header');
            const actionGroup = header?.lastElementChild;
            if (actionGroup instanceof HTMLElement && actionGroup !== header.firstElementChild) {
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

        updateButton(button);
        button.addEventListener('click', async () => {
            if (isStandalone()) return;
            if (!installPrompt) {
                showInstallInstructions();
                return;
            }

            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            installPrompt = null;
            if (outcome === 'accepted') updateButton(button);
        });
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        const manifest = document.querySelector('link[rel="manifest"]');
        const serviceWorkerUrl = manifest
            ? new URL('sw.js', manifest.href)
            : new URL('/sw.js', window.location.origin);
        navigator.serviceWorker.register(serviceWorkerUrl.href)
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
