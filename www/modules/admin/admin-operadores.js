/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Cadastro via Modal e monitoramento em tempo real do operador e status do caixa.
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
            <button id="btn-abrir-modal-operador" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow">
                + Cadastrar Operador
            </button>
        </div>

        <div class="bg-gray-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
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
                <tbody id="tabela-operadores-corpo" class="divide-y divide-gray-800">
                    <tr><td colspan="5" class="text-center p-6 text-gray-400">Carregando operadores e status...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- MODAL DE CADASTRO DE OPERADOR -->
    <div id="modal-operador" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-gray-800 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-gray-100 space-y-4">
            <div class="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 class="font-bold text-base text-white"><i class="fa-solid fa-user-plus text-emerald-500 mr-2"></i> Cadastrar Novo Operador</h3>
                <button id="btn-fechar-modal" class="text-gray-400 hover:text-white text-sm"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>

            <form id="form-cadastrar-operador" class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1">NOME DO OPERADOR</label>
                    <input type="text" id="op-nome" required placeholder="Ex: Apollo" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1">E-MAIL DE ACESSO</label>
                    <input type="email" id="op-email" required placeholder="operador@vancely.com" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1">SENHA DE ACESSO</label>
                    <input type="password" id="op-senha" required placeholder="Mínimo 6 dígitos" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-gray-700">
                    <button type="button" id="btn-cancelar-modal" class="bg-gray-700 hover:bg-gray-650 text-gray-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow">Salvar Operador</button>
                </div>
            </form>
        </div>
    </div>
    `;

    await carregarOperadoresComStatus();
    configurarModalOperador();
    inscreverTempoRealOperadores();
}

function configurarModalOperador() {
    const modal = document.getElementById('modal-operador');
    const btnAbrir = document.getElementById('btn-abrir-modal-operador');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const form = document.getElementById('form-cadastrar-operador');

    if (!modal) return;

    btnAbrir.addEventListener('click', () => modal.classList.remove('hidden'));
    btnFechar.addEventListener('click', () => modal.classList.add('hidden'));
    btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('op-nome').value.trim();
        const email = document.getElementById('op-email').value.trim();
        const senha = document.getElementById('op-senha').value.trim();

        // Verificar limite de 1 operador para o plano comum
        const { count, error: countErr } = await supabase
            .from('operadores')
            .select('*', { count: 'exact', head: true });

        if (!countErr && count >= 1) {
            alert('O plano atual permite apenas 1 operador cadastrado.');
            return;
        }

        // Inserir no Supabase (incluindo senha e status padrão)
        const { error } = await supabase.from('operadores').insert([{
            nome,
            email,
            senha,
            status_caixa: 'fechado',
            faturamento_atual: 0.00
        }]);

        if (error) {
            alert('Erro ao registrar operador: ' + error.message);
        } else {
            alert('Operador cadastrado com sucesso!');
            modal.classList.add('hidden');
            form.reset();
            await carregarOperadoresComStatus();
        }
    });
}

async function carregarOperadoresComStatus() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    if (!tbody) return;

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
            <td class="p-3 text-right">
                <button onclick="window.excluirOperador('${op.id}')" class="text-red-400 hover:text-red-300 text-xs font-bold">Remover</button>
            </td>
        </tr>
        `;
    }).join('');
}

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