/**
 * Módulo: Admin Histórico de Vendas (www/modules/admin/admin-historico.js)
 */

import { supabase } from '../../core/config.js';

function escaparTextoHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

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
    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar o histórico.');
    
    const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('PDV-VS: Erro ao carregar vendas da empresa:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-red-400 text-xs">Erro ao carregar vendas (${error.message}).</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhuma venda registrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="p-3 text-gray-300 text-xs">${item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '--'}</td>
            <td class="p-3 font-medium text-white">
                <div>Venda${item.operador ? ` - ${escaparTextoHtml(item.operador)}` : ''}</div>
                <div class="mt-1 text-[11px] font-normal text-gray-400">CPF: ${escaparTextoHtml(item.cliente_cpf || 'Não informado')}</div>
                <div class="text-[11px] font-normal text-gray-400">Pagamento: ${escaparTextoHtml(item.forma_pagamento || 'Não informado')}</div>
            </td>
            <td class="p-3 text-gray-300">--</td>
            <td class="p-3 font-bold text-emerald-400">R$ ${Number(item.valor_total || 0).toFixed(2)}</td>
            <td class="p-3 text-gray-300">--</td>
        </tr>
    `).join('');
}