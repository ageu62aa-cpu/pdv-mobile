let upgradeModal;

function obterModalUpgrade() {
    if (upgradeModal) return upgradeModal;

    upgradeModal = document.createElement('div');
    upgradeModal.id = 'modal-upgrade-plano';
    upgradeModal.className = 'fixed inset-0 z-[80] hidden items-center justify-center bg-black/80 p-4 backdrop-blur-sm';
    upgradeModal.innerHTML = `
        <section role="dialog" aria-modal="true" aria-labelledby="titulo-upgrade-plano" class="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-800 p-5 text-gray-100 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-bold uppercase tracking-wide text-amber-300">Mais possibilidades para sua empresa</p>
                    <h2 id="titulo-upgrade-plano" class="mt-1 text-lg font-bold text-white">Faça upgrade do seu plano</h2>
                </div>
                <button type="button" data-dismiss-upgrade class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-xl text-gray-300 hover:border-emerald-500 hover:text-white" aria-label="Fechar">&times;</button>
            </div>
            <p data-upgrade-message class="mt-4 text-sm leading-6 text-gray-300"></p>
            <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" data-dismiss-upgrade class="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-bold text-gray-200 hover:bg-gray-700">Agora não</button>
                <button type="button" data-go-to-plans class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">Ver planos e fazer upgrade</button>
            </div>
        </section>
    `;
    document.body.appendChild(upgradeModal);

    const fechar = () => {
        upgradeModal.classList.add('hidden');
        upgradeModal.classList.remove('flex');
    };
    upgradeModal.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target === upgradeModal || target.closest('[data-dismiss-upgrade]')) fechar();
        if (target.closest('[data-go-to-plans]')) {
            fechar();
            document.querySelector('.tab-btn[data-tab="planos"]')?.click();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !upgradeModal.classList.contains('hidden')) fechar();
    });

    return upgradeModal;
}

export function abrirModalUpgrade(mensagem) {
    const modal = obterModalUpgrade();
    modal.querySelector('[data-upgrade-message]').textContent = mensagem;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.querySelector('[data-dismiss-upgrade]')?.focus();
}
