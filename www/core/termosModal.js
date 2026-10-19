const termsPageUrl = new URL('../termos.html', import.meta.url);

export function inicializarModalTermos() {
    let modal = document.getElementById('modal-documentos-legais');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-documentos-legais';
        modal.className = 'fixed inset-0 z-[100] hidden items-center justify-center bg-black/80 p-4 backdrop-blur-sm';
        modal.innerHTML = `
            <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-legal" class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 text-gray-100 shadow-2xl">
                <header class="flex shrink-0 items-center justify-between border-b border-gray-700 px-5 py-4">
                    <h2 id="titulo-modal-legal" class="text-base font-bold text-white">Documentos legais</h2>
                    <button type="button" data-close-legal-modal class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-xl text-gray-300 transition hover:border-emerald-500 hover:text-white" aria-label="Fechar termos e política">&times;</button>
                </header>
                <div data-legal-content class="min-h-0 overflow-y-auto p-4 sm:p-6">
                    <p role="status" class="text-sm text-gray-300">Carregando Termos de Uso e Política de Privacidade...</p>
                </div>
            </section>
        `;
        document.body.appendChild(modal);
    }

    const content = modal.querySelector('[data-legal-content]');
    let previousFocus = null;
    let previousOverflow = '';

    async function openModal(trigger) {
        previousFocus = trigger;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.querySelector('[data-close-legal-modal]')?.focus();

        if (content.dataset.loaded === 'true' || content.dataset.loading === 'true') return;
        content.dataset.loading = 'true';
        try {
            const pageResponse = await fetch(termsPageUrl);
            if (!pageResponse.ok) throw new Error(`Falha ao carregar o documento (${pageResponse.status}).`);
            const pageHtml = await pageResponse.text();
            const page = new DOMParser().parseFromString(pageHtml, 'text/html');
            const main = page.querySelector('main');
            if (!main) throw new Error('O conteúdo dos documentos legais não foi encontrado.');

            main.className = 'space-y-8';
            content.replaceChildren(...Array.from(main.childNodes, node => document.importNode(node, true)));
            content.dataset.loaded = 'true';
        } catch (error) {
            console.error('Não foi possível abrir os Termos de Uso e a Política de Privacidade no modal:', error);
            content.innerHTML = `
                <p class="text-sm text-rose-300" role="alert">Não foi possível carregar os documentos nesta janela.</p>
                <a href="${termsPageUrl.href}" class="mt-3 inline-block text-sm font-bold text-emerald-400 underline">Abrir os Termos de Uso e a Política de Privacidade</a>
            `;
        } finally {
            delete content.dataset.loading;
        }
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = previousOverflow;
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }

    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const openTrigger = target.closest('[data-open-legal-modal]');
        if (openTrigger) {
            event.preventDefault();
            void openModal(openTrigger);
            return;
        }
        if (target.closest('[data-close-legal-modal]') || target === modal) closeModal();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
}
