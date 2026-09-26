/**
 * Módulo: Admin Histórico (www/modules/admin/admin-historico.js)
 * Acompanhamento detalhado de vendas e caixas anteriores (respeitando o plano).
 */

import { supabase } from '../../core/config.js';

export async function initAdminHistorico(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-gray-800">Histórico de Vendas e Fechamentos</h2>
                    <p class="text-xs text-gray-500">Acompanhe o faturamento diário, semanal e quinzenal da sua loja.</p>
                </div>
                <button id="btn-atualizar-historico" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                    Atualizar Dados
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <th class="p-3">Data / Hora</th>
                            <th class="p-3">Tipo de Operação</th>
                            <th class="p-3">Troco Inicial</th>
                            <th class="p-3">Total Faturado</th>
                            <th class="p-3">Balanço Final</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-historico-corpo" class="divide-y divide-gray-100">
                        <tr><td colspan="5" class="text-center p-4 text-gray-400">Carregando histórico...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarHistorico();

    containerEl.querySelector('#btn-atualizar-historico').addEventListener('click', carregarHistorico);
}

async function carregarHistorico() {
    const tbody = document.getElementById('tabela-historico-corpo');

    const { data: sessoes, error } = await supabase
        .from('caixa_sessoes')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar histórico: ${error.message}</td></tr>`;
        return;
    }

    if (!sessoes || sessoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-400">Nenhum registro de fechamento ou abertura encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = sessoes.map(s => {
        const dataFormatada = new Date(s.data_hora).toLocaleString('pt-BR');
        const badgeColor = s.tipo === 'FECHAMENTO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';

        return `
            <tr class="hover:bg-gray-50">
                <td class="p-3 text-xs text-gray-600">${dataFormatada}</td>
                <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${badgeColor}">${s.tipo}</span></td>
                <td class="p-3 text-gray-700">R$ ${(s.troco_inicial || 0).toFixed(2)}</td>
                <td class="p-3 font-bold text-emerald-700">R$ ${(s.total_faturado || 0).toFixed(2)}</td>
                <td class="p-3 font-semibold text-gray-800">R$ ${(s.balanco_final || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}