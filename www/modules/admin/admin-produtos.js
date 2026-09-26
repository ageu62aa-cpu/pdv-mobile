/**
 * Módulo: Admin Produtos (www/modules/admin/admin-produtos.js)
 * Cadastro, controle de estoque e verificação do limite do plano (1.000 produtos).
 */

import { supabase } from '../../core/config.js';

export async function initAdminProdutos(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-bold text-gray-800">Gerenciamento de Produtos e Estoque</h2>
                    <p id="txt-limite-produtos" class="text-xs text-gray-500">Verificando limite do plano...</p>
                </div>
                <button id="btn-novo-produto" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                    + Novo Produto
                </button>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                            <th class="p-3">Código</th>
                            <th class="p-3">Nome</th>
                            <th class="p-3">Categoria</th>
                            <th class="p-3">Preço (R$)</th>
                            <th class="p-3">Estoque</th>
                            <th class="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-produtos-corpo" class="divide-y divide-gray-100">
                        <tr><td colspan="6" class="text-center p-4 text-gray-400">Carregando produtos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarProdutos();

    document.getElementById('btn-novo-produto').addEventListener('click', async () => {
        // Verificar limite de 1.000 produtos para o plano comum
        const { count, error: countError } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true });

        if (!countError && count >= 1000) {
            alert('Limite máximo de 1.000 produtos atingido para o plano Comum Enterprise. Faça upgrade para cadastrar mais itens.');
            return;
        }

        const codigo = prompt('Código de Barras do Produto:');
        if (!codigo) return;
        const nome = prompt('Nome do Produto:');
        if (!nome) return;
        const categoria = prompt('Categoria (ex: Hortifrúti, Laticínios, Bebidas):', 'Geral');
        const preco = parseFloat(prompt('Preço de Venda (R$):', '0.00').replace(',', '.'));
        const estoque = parseInt(prompt('Quantidade em Estoque:', '10'), 10);

        const { error } = await supabase.from('produtos').insert([{
            codigo_barras: codigo,
            nome,
            categoria,
            preco,
            estoque
        }]);

        if (error) {
            alert('Erro ao cadastrar produto: ' + error.message);
        } else {
            alert('Produto cadastrado com sucesso!');
            carregarProdutos();
        }
    });
}

async function carregarProdutos() {
    const tbody = document.getElementById('tabela-produtos-corpo');
    const txtLimite = document.getElementById('txt-limite-produtos');

    const { data: produtos, count, error } = await supabase
        .from('produtos')
        .select('*', { count: 'exact' });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">Erro ao carregar produtos.</td></tr>`;
        return;
    }

    txtLimite.textContent = `Utilizando ${count || 0} de 1.000 produtos permitidos no plano Comum.`;

    if (!produtos || produtos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Nenhum produto cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = produtos.map(p => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-mono text-xs text-gray-600">${p.codigo_barras}</td>
            <td class="p-3 font-medium text-gray-800">${p.nome}</td>
            <td class="p-3 text-gray-600 text-xs">${p.categoria || 'Geral'}</td>
            <td class="p-3 font-bold text-emerald-700">R$ ${p.preco.toFixed(2)}</td>
            <td class="p-3 text-gray-700">${p.estoque} un</td>
            <td class="p-3 text-right">
                <button onclick="window.excluirProduto('${p.id}')" class="text-red-500 hover:text-red-700 text-xs font-bold">Excluir</button>
            </td>
        </tr>
    `).join('');
}

window.excluirProduto = async function(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else carregarProdutos();
};