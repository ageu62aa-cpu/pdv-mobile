(() => {
    let installPrompt = null;
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    function isStandalone() {
        return standaloneQuery.matches || window.navigator.standalone === true;
    }

    function isInstalled() {
        return isStandalone() || localStorage.getItem('pdvPwaInstalled') === 'true';
    }

    function showInstallInstructions() {
        if (isInstalled() && !isStandalone()) {
            window.alert('O PDV-VS já está instalado. Para abrir o aplicativo, toque no ícone do mascote na tela inicial ou na lista de aplicativos.');
            return;
        }

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
        button.title = isInstalled() ? 'Abrir o PDV-VS instalado' : 'Instalar o PDV-VS';
        button.setAttribute('aria-label', button.title);
        if (isInstalled()) {
            button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M3 12h12m-5-5 5 5-5 5"/></svg>';
            return;
        }

        button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v3h14v-3"/></svg>';
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
            if (isInstalled() || !installPrompt) {
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
        localStorage.setItem('pdvPwaInstalled', 'true');
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
