/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 */
import { supabase } from '../../core/config.js';

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-white">Gerenciamento de Operadores (Caixa)</h2>
                    <p class="text-xs text-gray-400">Monitore os operadores e caixas vinculados em tempo real.</p>
                </div>
            </div>

            <div class="bg-gray-900 rounded-xl shadow-md border border-gray-700 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-800 border-b border-gray-700 text-xs text-gray-400 uppercase">
                            <th class="p-3">Usuário / ID</th>
                            <th class="p-3">Cargo</th>
                            <th class="p-3">Status do Caixa</th>
                            <th class="p-3">Faturamento Atual</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-operadores-corpo" class="divide-y divide-gray-800 text-gray-200">
                        <tr><td colspan="4" class="text-center p-6 text-gray-400">Carregando operadores...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarDadosOperadores();
}

async function carregarDadosOperadores() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    if (!tbody) return;

    // Busca os registros diretamente da tabela de controle de caixas/usuários
    const { data: caixas, error } = await supabase.from('caixas').select('*');

    if (error || !caixas || caixas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-gray-400">Nenhum caixa ou operador registrado no momento.</td></tr>`;
        return;
    }

    tbody.innerHTML = caixas.map(c => {
        const isOpen = c.status === 'ABERTO';
        const badge = isOpen 
            ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-emerald-900/60 text-emerald-400 border border-emerald-700">Caixa Aberto</span>'
            : '<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-900/40 text-red-400 border border-red-800">Caixa Fechado</span>';

        return `
            <tr class="hover:bg-gray-800/50">
                <td class="p-3 font-mono text-xs text-white">ID: ${c.user_id || 'N/A'}</td>
                <td class="p-3 text-gray-300 text-xs">${c.cargo || 'Operador'}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 font-bold text-emerald-400 font-mono">R$ ${Number(c.faturamento_dia || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}