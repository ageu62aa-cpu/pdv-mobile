/**
 * Componente: Caixa Busca (www/modules/pdv/components/caixa-busca.js)
 * Gerencia a barra de pesquisa inteligente, leitura de códigos e atalho F5.
 */

export function initCaixaBusca(onItemAdded) {
    const container = document.createElement('div');
    container.className = 'w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 mb-3';
    
    container.innerHTML = `
        <div class="flex items-center justify-between">
            <label for="input-busca-produto" class="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pesquisa / Código de Barras <span class="text-emerald-600">(Atalho: F5)</span>
            </label>
            <span id="scanner-status" class="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Leitor Ativo
            </span>
        </div>
        <div class="relative flex items-center">
            <input 
                type="text" 
                id="input-busca-produto" 
                placeholder="Escaneie o código de barras ou digite o nome do produto..." 
                autocomplete="off"
                class="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all text-sm font-medium"
            >
            <svg class="w-5 h-5 text-gray-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>
    `;

    const inputBusca = container.querySelector('#input-busca-produto');

    // Atalho F5 para focar na barra de busca
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault(); // Evita recarregar a página do navegador
            inputBusca.focus();
            inputBusca.select();
        }
    });

    // Evento de captura contínua (Leitor de código de barras ou digitação)
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    inputBusca.addEventListener('keypress', (e) => {
        // Se a entrada for muito rápida (característica de pistolas/leitores USB), pode-se tratar aqui se necessário.
        if (e.key === 'Enter') {
            e.preventDefault();
            const termo = inputBusca.value.trim();
            if (termo) {
                onItemAdded(termo);
                inputBusca.value = '';
            }
        }
    });

    return {
        element: container,
        focus: () => inputBusca.focus()
    };
}