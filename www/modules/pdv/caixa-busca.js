/**
 * Componente: Caixa Busca (www/modules/pdv/components/caixa-busca.js)
 * Gerencia a barra de pesquisa inteligente, leitura de códigos e atalho F5 com tema escuro consistente.
 */

export function initCaixaBusca(onItemAdded) {
    const container = document.createElement('div');
    // Ajustado para o tema escuro (bg-gray-800 e border-gray-700) mantendo a mesma estrutura visual
    container.className = 'w-full bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700 flex flex-col gap-2';
    
    container.innerHTML = `
        <div class="flex items-center justify-between">
            <label for="input-busca-produto" class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Pesquisa / Código de Barras <span class="text-emerald-400">(Atalho: F5)</span>
            </label>
            <button id="btn-ativar-camera" class="text-xs text-emerald-400 font-medium flex items-center gap-1 hover:text-emerald-300 transition-colors focus:outline-none" title="Clique para ativar o leitor de câmera">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Leitor Ativo
            </button>
        </div>
        <div class="relative flex items-center">
            <input 
                type="text" 
                id="input-busca-produto" 
                placeholder="Escaneie o código de barras ou digite o nome do produto..." 
                autocomplete="off"
                class="w-full px-4 py-3 pl-10 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-gray-900 transition-all text-sm font-medium"
            >
            <svg class="w-5 h-5 text-gray-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>
    `;

    const inputBusca = container.querySelector('#input-busca-produto');
    const btnCamera = container.querySelector('#btn-ativar-camera');

    // Evento para acionar a câmera ao clicar no status do leitor
    btnCamera.addEventListener('click', () => {
        // Integração com o módulo de câmera existente no projeto (ex: camera-native.js ou camera.js)
        if (typeof window.abrirCameraScanner === 'function') {
            window.abrirCameraScanner((codigoLido) => {
                if (codigoLido) {
                    inputBusca.value = codigoLido;
                    onItemAdded(codigoLido);
                    inputBusca.value = '';
                }
            });
        } else {
            alert('Módulo de Câmera Contínua pronto para ativação via Capacitor.');
        }
    });

    // Evento de captura via Enter (Pistola USB ou digitação)
    inputBusca.addEventListener('keypress', (e) => {
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