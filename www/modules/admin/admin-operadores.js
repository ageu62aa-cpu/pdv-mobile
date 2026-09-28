/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Cadastro, controle e monitoramento em tempo real do operador e status do caixa.
 */

import { supabase } from '../../core/config.js';

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-lg font-bold text-white">Gerenciamento de Operadores (Caixa)</h2>
                <p class="text-xs text-gray-400">Monitore o operador vinculado, status do caixa e faturamento em tempo real.</p>
            </div>
            <button id="btn-novo-operador" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow">
                + Cadastrar Operador
            </button>
        </div>

        <div class="bg-gray-850 bg-gray-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
            <table class="w-full text-left border-collapse text-sm">
                <thead>
                    <tr class="bg-gray-800 border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <th class="p-3">Nome do Operador</th>
                        <th class="p-3">E-mail</th>
                        <th class="p-3">Status do Caixa</th>
                        <th class="p-3">Faturamento Atual</th>
                        <th class="p-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody id="tabela-operadores-corpo" class="divide-y divide-gray-750">
                    <tr><td colspan="5" class="text-center p-6 text-gray-400">Carregando operadores e status...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    await carregarOperadoresComStatus();
    inscreverTempoRealOperadores(containerEl);

    // Botão de novo operador
    const btnNovo = document.getElementById('btn-novo-operador');
    if (btnNovo) {
        btnNovo.addEventListener('click', async () => {
            const { count, error: countErr } = await supabase
                .from('operadores')
                .select('*', { count: 'exact', head: true });

            if (!countErr && count >= 1) {
                alert('O plano atual permite apenas 1 operador cadastrado.');
                return;
            }

            const nome = prompt('Nome do Operador (Ex: Apollo):');
            if (!nome) return;
            const email = prompt('E-mail de acesso do Operador:');
            if (!email) return;
            const pin = prompt('Defina um PIN numérico (4 dígitos):', '1234');

            const { error } = await supabase.from('operadores').insert([{
                nome,
                email,
                pin,
                status_caixa: 'fechado',
                faturamento_atual: 0
            }]);

            if (error) {
                alert('Erro ao registrar operador: ' + error.message);
            } else {
                alert('Operador cadastrado com sucesso!');
                await carregarOperadoresComStatus();
            }
        });
    }
}

async function carregarOperadoresComStatus() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    if (!tbody) return;

    // Busca operadores e o status atual da sessão de caixa vinculada
    const { data: operadores, error } = await supabase.from('operadores').select('*');

    if (error || !operadores || operadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhum operador cadastrado. Utilize o botão acima para adicionar.</td></tr>`;
        return;
    }

    tbody.innerHTML = operadores.map(op => {
        const caixaAberto = op.status_caixa === 'aberto';
        const badgeStatus = caixaAberto 
            ? `<span class="px-2 py-1 bg-emerald-900/60 text-emerald-400 border border-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caixa Aberto</span>`
            : `<span class="px-2 py-1 bg-red-900/50 text-red-300 border border-red-800 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><span class="w-2 h-2 rounded-full bg-red-500"></span> Caixa Fechado</span>`;

        return `
        <tr class="hover:bg-gray-800 transition-colors">
            <td class="p-3 font-bold text-white">${op.nome}</td>
            <td class="p-3 text-gray-300 text-xs">${op.email}</td>
            <td class="p-3">${badgeStatus}</td>
            <td class="p-3 font-mono font-bold text-emerald-400">R$ ${Number(op.faturamento_atual || 0).toFixed(2)}</td>
            <td class="p-3 text-right space-x-2">
                <button onclick="window.excluirOperador('${op.id}')" class="text-red-400 hover:text-red-300 text-xs font-bold">Remover</button>
            </td>
        </tr>
        `;
    }).join('');
}

// Configuração do Supabase Realtime para atualizar instantaneamente na tela do Admin
function inscreverTempoRealOperadores() {
    try {
        supabase
            .channel('public:operadores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'operadores' }, () => {
                carregarOperadoresComStatus();
            })
            .subscribe();
    } catch (e) {
        console.error("Erro ao ativar tempo real:", e);
    }
}

window.excluirOperador = async function(id) {
    if (!confirm('Deseja realmente remover este operador?')) return;
    const { error } = await supabase.from('operadores').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else await carregarOperadoresComStatus();
};