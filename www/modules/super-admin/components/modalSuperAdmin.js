/**
 * Componente: Modal Super Admin (www/modules/super-admin/modalSuperadmin.js)
 * Janela flutuante padronizada para ações do painel mestre.
 */

export function criarModalSuperAdmin(titulo, conteudoHtml, onSalvar) {
    const modalId = 'super-admin-modal-dinamico';
    let modalEl = document.getElementById(modalId);

    if (modalEl) modalEl.remove();

    modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50';

    modalEl.innerHTML = `
        <div class="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 text-gray-100 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                <h3 class="text-lg font-bold text-white">${titulo}</h3>
                <button id="modal-close-btn" class="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            <div id="modal-body">
                ${conteudoHtml}
            </div>
        </div>
    `;

    document.body.appendChild(modalEl);

    const fechar = () => modalEl.remove();
    modalEl.querySelector('#modal-close-btn').addEventListener('click', fechar);
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) fechar();
    });

    if (typeof onSalvar === 'function') {
        const btnSalvar = modalEl.querySelector('#modal-save-btn');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', async () => {
                const sucesso = await onSalvar(modalEl);
                if (sucesso) fechar();
            });
        }
    }

    return modalEl;
}