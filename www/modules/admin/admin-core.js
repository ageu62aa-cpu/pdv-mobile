import { initAdminProdutos } from './admin-produtos.js';
import { initAdminOperadores } from './admin-operadores.js';
import { initAdminMaquininhas } from './admin-maquininhas.js';
import { initAdminHistorico } from './admin-historico.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('admin-conteudo-dinamico');
    const botoesTab = document.querySelectorAll('.tab-btn');

    async function carregarAba(tabName) {
        container.innerHTML = `<p class="text-center text-gray-400 py-8">Carregando...</p>`;
        
        botoesTab.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'tab-btn text-left px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800 transition-colors';
            } else {
                btn.className = 'tab-btn text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors';
            }
        });

        if (tabName === 'produtos') await initAdminProdutos(container);
        else if (tabName === 'operadores') await initAdminOperadores(container);
        else if (tabName === 'maquininhas') await initAdminMaquininhas(container);
        else if (tabName === 'historico') await initAdminHistorico(container);
    }

    botoesTab.forEach(btn => {
        btn.addEventListener('click', () => carregarAba(btn.dataset.tab));
    });

    // Iniciar na aba padrão
    carregarAba('produtos');
});