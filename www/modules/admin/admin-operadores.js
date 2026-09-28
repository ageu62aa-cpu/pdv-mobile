/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Cadastro via Modal e monitoramento em tempo real dos operadores na tabela usuarios_empresas.
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

    btnAbrir.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (modalFeedback) modalFeedback.classList.add('hidden');
    });
    btnFechar.addEventListener('click', () => modal.classList.add('hidden'));
    btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));

    // Elemento de feedback visual dentro do modal de operador
    let modalFeedback = document.getElementById('modal-operador-feedback');
    if (!modalFeedback && modal) {
        const formEl = document.getElementById('form-cadastrar-operador');
        modalFeedback = document.createElement('div');
        modalFeedback.id = 'modal-operador-feedback';
        modalFeedback.className = 'mt-3 text-center text-xs font-medium transition-all duration-300 hidden py-2 px-3 rounded-lg';
        formEl.insertBefore(modalFeedback, formEl.firstChild);
    }

    function showModalFeedback(message, type) {
        if (!modalFeedback) return;
        modalFeedback.className = "mt-3 text-center text-xs font-medium transition-all duration-300 py-2 px-3 rounded-lg";
        
        if (type === 'error') {
            modalFeedback.classList.add('text-rose-400', 'bg-rose-950/40', 'border', 'border-rose-500/30');
            modalFeedback.innerText = message;
        } else if (type === 'success') {
            modalFeedback.classList.add('text-emerald-400', 'bg-emerald-950/40', 'border', 'border-emerald-500/30');
            modalFeedback.innerText = message;
        }
        modalFeedback.classList.remove('hidden');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (modalFeedback) modalFeedback.classList.add('hidden');

        const nome = document.getElementById('op-nome').value.trim();
        const email = document.getElementById('op-email').value.trim();
        const senha = document.getElementById('op-senha').value.trim();

        try {
            // 1. Descobrir qual é a empresa_id do admin logado atualmente
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Administrador não autenticado.');

            const { data: adminEmpresa, error: errEmp } = await supabase
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', user.id)
                .single();

            if (errEmp || !adminEmpresa) throw new Error('Não foi possível identificar a empresa do administrador.');

            // 2. Verificar quantos operadores já estão cadastrados para esta empresa
            const { count, error: countErr } = await supabase
                .from('usuarios_empresas')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', adminEmpresa.empresa_id)
                .eq('cargo', 'operador');

            if (!countErr && count >= 1) {
                showModalFeedback('Limite do plano atingido: O plano atual permite apenas 1 operador. Faça o upgrade para o Plano Premium para adicionar mais.', 'error');
                return;
            }

            // 3. Criar o usuário operador no Auth do Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({ 
                email, 
                password: senha,
                options: { data: { nome } }
            });

            if (authError) throw new Error(authError.message);

            const novoUserId = authData.user?.id;
            if (!novoUserId) throw new Error('Erro ao gerar ID de autenticação para o operador.');

            // 4. Inserir na tabela usuarios_empresas com cargo 'operador'
            const { error: dbError } = await supabase.from('usuarios_empresas').insert([{
                user_id: novoUserId,
                empresa_id: adminEmpresa.empresa_id,
                cargo: 'operador',
                status_caixa: 'fechado',
                faturamento_atual: 0.00
            }]);

            if (dbError) throw new Error(dbError.message);

            showModalFeedback('Operador cadastrado com sucesso!', 'success');
            setTimeout(() => {
                modal.classList.add('hidden');
                form.reset();
                if (modalFeedback) modalFeedback.classList.add('hidden');
                carregarOperadoresComStatus();
            }, 1200);

        } catch (err) {
            showModalFeedback('Erro ao registar operador: ' + err.message, 'error');
        }
    });
}

async function carregarOperadoresComStatus() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    if (!tbody) return;

    // Buscar apenas os registros que possuem cargo 'operador' na tabela usuarios_empresas
    const { data: operadores, error } = await supabase
        .from('usuarios_empresas')
        .select('*')
        .eq('cargo', 'operador');

    if (error || !operadores || operadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhum operador cadastrado. Utilize o botão acima para adicionar.</td></tr>`;
        return;
    }

    // Como o e-mail e nome podem estar na tabela auth ou precisamos buscar, vamos exibir com base nos dados disponíveis
    tbody.innerHTML = operadores.map(op => {
        const caixaAberto = op.status_caixa === 'aberto';
        const badgeStatus = caixaAberto 
            ? '<span class="px-2 py-1 bg-emerald-900/60 text-emerald-400 border border-emerald-700 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caixa Aberto</span>'
            : '<span class="px-2 py-1 bg-red-900/50 text-red-300 border border-red-800 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><span class="w-2 h-2 rounded-full bg-red-500"></span> Caixa Fechado</span>';

        return `
        <tr class="hover:bg-gray-800 transition-colors">
            <td class="p-3 font-bold text-white">Operador ID: ${op.user_id.substring(0, 8)}...</td>
            <td class="p-3 text-gray-300 text-xs font-mono">${op.user_id}</td>
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
            .channel('public:usuarios_empresas_operadores')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios_empresas', filter: "cargo=eq.operador" }, () => {
                carregarOperadoresComStatus();
            })
            .subscribe();
    } catch (e) {
        console.error("Erro ao ativar tempo real:", e);
    }
}

window.excluirOperador = async function(id) {
    if (!confirm('Deseja realmente remover este vínculo de operador?')) return;
    const { error } = await supabase.from('usuarios_empresas').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else await carregarOperadoresComStatus();
};