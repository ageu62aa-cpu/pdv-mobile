/**
 * Módulo: Admin Histórico de Vendas (www/modules/admin/admin-historico.js)
 */

import { supabase } from '../../core/config.js';

export async function initAdminHistorico(containerEl) {
    containerEl.innerHTML = `
    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-lg font-bold text-white">Histórico de Vendas e Caixa</h2>
                <p class="text-xs text-gray-400">Acompanhe o faturamento diário, semanal e quinzenal de sua loja.</p>
            </div>
            <button id="btn-atualizar-historico" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow">
                Atualizar Dados
            </button>
        </div>

        <div class="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
            <table class="w-full text-left border-collapse text-sm">
                <thead>
                    <tr class="bg-gray-850 bg-gray-900 border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <th class="p-3">Data / Hora</th>
                        <th class="p-3">Tipo de Operação</th>
                        <th class="p-3">Troco Inicial</th>
                        <th class="p-3">Total Faturado</th>
                        <th class="p-3">Balanço Final</th>
                    </tr>
                </thead>
                <tbody id="tabela-historico-corpo" class="divide-y divide-gray-750">
                    <tr><td colspan="5" class="text-center p-6 text-gray-400">Carregando histórico...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    await carregarHistorico();

    document.getElementById('btn-atualizar-historico').addEventListener('click', carregarHistorico);
}

async function carregarHistorico() {
    const tbody = document.getElementById('tabela-historico-corpo');
    
    // Tentativa de consulta à tabela de sessões/caixa
    const { data, error } = await supabase
        .from('caixa_sessoes')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        // Exibe o aviso amigável caso a tabela não exista no Supabase ainda
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-amber-400 text-xs">Nota: A tabela de sessões de caixa ainda não foi criada no banco de dados (${error.message}).</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhum registro de venda encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="p-3 text-gray-300 text-xs">${item.criado_em || '--'}</td>
            <td class="p-3 font-medium text-white">${item.tipo_operacao || 'Caixa'}</td>
            <td class="p-3 text-gray-300">R$ ${Number(item.troco_inicial || 0).toFixed(2)}</td>
            <td class="p-3 font-bold text-emerald-400">R$ ${Number(item.total_faturado || 0).toFixed(2)}</td>
            <td class="p-3 text-gray-300">R$ ${Number(item.balanco_final || 0).toFixed(2)}</td>
        </tr>
    `).join('');
}