/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Monitoramento em tempo real de operadores, caixas e faturamento via Supabase.
 */

import { supabase } from '../../core/config.js';

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-white">Gerenciamento de Operadores (Caixa)</h2>
                    <p class="text-xs text-gray-400">Monitore operadores, status de caixa e faturamento em tempo real.</p>
                </div>
                <button id="btn-novo-operador" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow">
                    + Cadastrar Operador
                </button>
            </div>

            <div class="bg-gray-900 rounded-xl shadow-md border border-gray-700 overflow-hidden">
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
                    <tbody id="tabela-operadores-corpo" class="divide-y divide-gray-800 text-gray-200">
                        <tr><td colspan="5" class="text-center p-6 text-gray-400">Carregando operadores e caixas...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarOperadoresComStatus();
    ativarRealtimeAdmin();

    const btnNovo = document.getElementById('btn-novo-operador');
    if (btnNovo) {
        btnNovo.addEventListener('click', async () => {
            const nome = prompt('Nome Completo do Operador:');
            if (!nome) return;
            const email = prompt('E-mail de acesso do Operador:');
            if (!email) return;

            const { error } = await supabase.from('operadores').insert([{ nome, email }]);
            if (error) {
                alert('Erro ao registrar operador: ' + error.message);
            } else {
                alert('Operador cadastrado com sucesso!');
                carregarOperadoresComStatus();
            }
        });
    }
}

async function carregarOperadoresComStatus() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    if (!tbody) return;

    // 1. Busca os operadores cadastrados
    const { data: operadores, error: errOp } = await supabase.from('operadores').select('*');
    
    if (errOp || !operadores || operadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhum operador cadastrado.</td></tr>`;
        return;
    }

    // 2. Busca o status atual das sessões de caixa abertas/fechadas
    const { data: sessoes, error: errSessao } = await supabase.from('caixa_sessoes').select('*');

    tbody.innerHTML = operadores.map(op => {
        // Localiza a sessão de caixa correspondente ao operador (por ID ou e-mail)
        const sessao = sessoes?.find(s => s.operador_id === op.id || s.email === op.email);
        
        const isOpen = sessao && sessao.status === 'ABERTO';
        const statusBadge = isOpen 
            ? '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-400 border border-emerald-700 flex items-center w-fit gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Caixa Aberto</span>'
            : '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-900/40 text-red-400 border border-red-800 flex items-center w-fit gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Caixa Fechado</span>';

        const faturamento = Number(sessao?.total_faturado || sessao?.faturamento_atual || 0).toFixed(2);

        return `
            <tr class="hover:bg-gray-800/50 transition-colors">
                <td class="p-3 font-semibold text-white">${op.nome || 'Operador Sem Nome'}</td>
                <td class="p-3 text-gray-400 text-xs">${op.email || 'E-mail não informado'}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 font-bold text-emerald-400 font-mono">R$ ${faturamento}</td>
                <td class="p-3 text-right">
                    <button onclick="window.excluirOperador('${op.id}')" class="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded bg-red-950/40 border border-red-900 transition">Remover</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Ativa escuta em tempo real para refletir abertura de caixa e vendas instantaneamente no Admin
function ativarRealtimeAdmin() {
    supabase
        .channel('admin-dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_sessoes' }, () => {
            carregarOperadoresComStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
            carregarOperadoresComStatus();
        })
        .subscribe();
}

window.excluirOperador = async function(id) {
    if (!confirm('Deseja realmente remover este operador?')) return;
    const { error } = await supabase.from('operadores').delete().eq('id', id);
    if (error) alert('Erro ao remover: ' + error.message);
    else carregarOperadoresComStatus();
};