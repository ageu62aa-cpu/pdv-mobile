/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Cadastro e controle do operador único permitido no plano comum.
 */

import { supabase } from '../../core/config.js';

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-gray-800">Gerenciamento de Operadores (Caixa)</h2>
                    <p class="text-xs text-gray-500">O plano Comum permite cadastrar exatamente 1 operador vinculado.</p>
                </div>
                <button id="btn-novo-operador" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                    + Cadastrar Operador
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <th class="p-3">Nome do Operador</th>
                            <th class="p-3">E-mail</th>
                            <th class="p-3">PIN Atribuído</th>
                            <th class="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-operadores-corpo" class="divide-y divide-gray-100">
                        <tr><td colspan="4" class="text-center p-4 text-gray-400">Carregando operadores...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarOperadores();

    document.getElementById('btn-novo-operador').addEventListener('click', async () => {
        // Verificar limite de 1 operador
        const { count, error: countErr } = await supabase
            .from('operadores')
            .select('*', { count: 'exact', head: true });

        if (!countErr && count >= 1) {
            alert('O plano atual permite apenas 1 operador cadastrado.');
            return;
        }

        const nome = prompt('Nome Completo do Operador:');
        if (!nome) return;
        const email = prompt('E-mail de acesso do Operador:');
        if (!email) return;
        const pin = prompt('Defina um PIN numérico (4 dígitos) para autorizações:', '1234');

        const { error } = await supabase.from('operadores').insert([{
            nome,
            email,
            pin
        }]);

        if (error) {
            alert('Erro ao registrar operador: ' + error.message);
        } else {
            alert('Operador cadastrado com sucesso!');
            carregarOperadores();
        }
    });
}

async function carregarOperadores() {
    const tbody = document.getElementById('tabela-operadores-corpo');
    const { data: operadores, error } = await supabase.from('operadores').select('*');

    if (error || !operadores || operadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-400">Nenhum operador cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = operadores.map(op => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-medium text-gray-800">${op.nome}</td>
            <td class="p-3 text-gray-600 text-xs">${op.email}</td>
            <td class="p-3 font-mono font-bold text-emerald-700">****</td>
            <td class="p-3 text-right">
                <button onclick="window.excluirOperador('${op.id}')" class="text-red-500 hover:text-red-700 text-xs font-bold">Remover</button>
            </td>
        </tr>
    `).join('');
}

window.excluirOperador = async function(id) {
    if (!confirm('Deseja remover este operador?')) return;
    await supabase.from('operadores').delete().eq('id', id);
    carregarOperadores();
};