/**
 * Módulo: Admin Produtos (www/modules/admin/admin-produtos.js)
 * Cadastro, controle de estoque, busca, scanner e verificação de limite do plano (1.000 produtos).
 */

import { supabase } from '../../core/config.js';

let produtosCacheAdmin = [];

export async function initAdminProdutos(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4">
            <!-- Topo: Título e Botão Novo Produto -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <h2 class="text-lg font-bold text-white">Gerenciamento de Produtos e Estoque</h2>
                    <p id="txt-limite-produtos" class="text-xs text-gray-400">Verificando limite do plano...</p>
                </div>
                <button onclick="window.abrirModalNovoProduto()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> Novo Produto
                </button>
            </div>

            <!-- Barra de Pesquisa e Scanner (Otimizado para Mobile e Pistola Física) -->
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                <div class="relative flex-1 w-full">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input type="text" id="inputBuscaAdminProdutos" oninput="window.filtrarProdutosAdmin(this.value)" placeholder="Pesquise pelo nome ou código de barras..." class="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>
                <!-- Botão Compacto para Mobile / Compatível com Foco para Pistola -->
                <button onclick="window.ativarScannerAdmin()" title="Ativar Leitor / Foco para Pistola" class="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition border border-gray-600">
                    <i class="fa-solid fa-barcode text-emerald-400"></i> <span class="md:hidden">Leitor</span>
                </button>
            </div>

            <!-- Tabela de Produtos -->
            <div class="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-900 border-b border-gray-700 text-xs text-gray-400 uppercase">
                            <th class="p-3">Código</th>
                            <th class="p-3">Nome</th>
                            <th class="p-3">Categoria</th>
                            <th class="p-3">Preço (R$)</th>
                            <th class="p-3">Estoque</th>
                            <th class="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-produtos-corpo" class="divide-y divide-gray-700">
                        <tr><td colspan="6" class="text-center p-4 text-gray-400">Carregando produtos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal Personalizado de Cadastro / Edição -->
        <div id="modalFormProdutoAdmin" class="fixed inset-0 bg-black/80 z-50 hidden flex items-center justify-center p-4">
            <div class="bg-gray-800 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl p-6 text-gray-100 animate-scaleUp">
                <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                    <h3 id="modalTituloProduto" class="font-bold text-lg text-white flex items-center gap-2">
                        <i class="fa-solid fa-box text-emerald-500"></i> Novo Produto
                    </h3>
                    <button onclick="window.fecharModalProdutoAdmin()" class="text-gray-400 hover:text-gray-200 text-lg"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form id="formProdutoAdmin" onsubmit="window.salvarProdutoAdmin(event)" class="space-y-4">
                    <input type="hidden" id="formProdId">
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-300 mb-1">NOME DO PRODUTO</label>
                        <input type="text" id="formProdNome" required placeholder="Ex: Batom Matte / Coca-Cola" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-300 mb-1">CÓDIGO DE BARRAS / SKU</label>
                            <div class="flex gap-2">
                                <!-- Compatível com digitação, pistola USB/Bluetooth (foco direto) -->
                                <input type="text" id="formProdCodigo" placeholder="Ex: 7891000..." class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                <!-- Botão dedicado exclusivo para abrir a câmera no Smartphone -->
                                <button type="button" onclick="window.ativarScannerModal()" title="Escanear com Câmera do Celular" class="bg-gray-700 hover:bg-gray-600 px-3 py-3 rounded-lg text-emerald-400 border border-gray-600 transition flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-camera"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-300 mb-1">CATEGORIA</label>
                            <input type="text" id="formProdCategoria" placeholder="Ex: Maquiagens, Bebidas" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-300 mb-1">PREÇO (R$)</label>
                            <input type="number" step="0.01" id="formProdPreco" required placeholder="0.00" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-emerald-400 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-300 mb-1">ESTOQUE</label>
                            <input type="number" step="any" id="formProdEstoque" required placeholder="0" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-300 mb-1">UNIDADE</label>
                            <select id="formProdUnidade" class="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                <option value="UN">UN (Unidade)</option>
                                <option value="KG">KG (Peso)</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex space-x-2 pt-2">
                        <button type="button" onclick="window.fecharModalProdutoAdmin()" class="w-1/2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-3 rounded-lg font-bold text-sm transition">Cancelar</button>
                        <button type="submit" class="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold text-sm shadow transition">Salvar Produto</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await carregarProdutosAdmin();
}

async function carregarProdutosAdmin() {
    const tbody = document.getElementById('tabela-produtos-corpo');
    const txtLimite = document.getElementById('txt-limite-produtos');

    const { data: produtos, count, error } = await supabase
        .from('produtos')
        .select('*', { count: 'exact' })
        .order('nome', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-400">Erro ao carregar produtos.</td></tr>`;
        return;
    }

    produtosCacheAdmin = produtos || [];
    txtLimite.textContent = `Utilizando ${count || 0} de 1.000 produtos permitidos no plano Comum.`;

    renderizarTabelaAdmin(produtosCacheAdmin);
}

function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabela-produtos-corpo');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="p-3 font-mono text-xs text-gray-300">${p.codigo || '-'}</td>
            <td class="p-3 font-medium text-white">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-400 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-3 text-gray-300 text-xs">${p.categoria || 'Geral'}</td>
            <td class="p-3 font-bold text-emerald-400">R$ ${Number(p.preco || 0).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-3 text-gray-300">${p.estoque} ${p.unidade || 'UN'}</td>
            <td class="p-3 text-right space-x-2">
                <button onclick='window.abrirModalEditarProduto(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="text-blue-400 hover:text-blue-300 transition" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.excluirProdutoAdmin('${p.id}')" class="text-red-400 hover:text-red-300 transition" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.filtrarProdutosAdmin = function(termo) {
    const t = termo.toLowerCase();
    const filtrados = produtosCacheAdmin.filter(p => 
        p.nome.toLowerCase().includes(t) || 
        (p.codigo && p.codigo.toLowerCase().includes(t)) ||
        (p.categoria && p.categoria.toLowerCase().includes(t))
    );
    renderizarTabelaAdmin(filtrados);
};

window.abrirModalNovoProduto = async function() {
    if (produtosCacheAdmin.length >= 1000) {
        alert('Limite máximo de 1.000 produtos atingido para o plano Comum.');
        return;
    }

    document.getElementById('modalTituloProduto').innerHTML = `<i class="fa-solid fa-box text-emerald-500"></i> Novo Produto`;
    document.getElementById('formProdId').value = '';
    document.getElementById('formProdNome').value = '';
    document.getElementById('formProdCodigo').value = '';
    document.getElementById('formProdCategoria').value = 'Geral';
    document.getElementById('formProdPreco').value = '';
    document.getElementById('formProdEstoque').value = '';
    document.getElementById('formProdUnidade').value = 'UN';

    document.getElementById('modalFormProdutoAdmin').classList.remove('hidden');
    
    // Deixa o foco pronto caso o operador use pistola física logo ao abrir o modal
    setTimeout(() => document.getElementById('formProdCodigo').focus(), 100);
};

window.abrirModalEditarProduto = function(p) {
    document.getElementById('modalTituloProduto').innerHTML = `<i class="fa-solid fa-pen-to-square text-emerald-500"></i> Editar Produto`;
    document.getElementById('formProdId').value = p.id;
    document.getElementById('formProdNome').value = p.nome || '';
    document.getElementById('formProdCodigo').value = p.codigo || '';
    document.getElementById('formProdCategoria').value = p.categoria || 'Geral';
    document.getElementById('formProdPreco').value = p.preco || 0;
    document.getElementById('formProdEstoque').value = p.estoque || 0;
    document.getElementById('formProdUnidade').value = p.unidade || 'UN';

    document.getElementById('modalFormProdutoAdmin').classList.remove('hidden');
};

window.fecharModalProdutoAdmin = function() {
    document.getElementById('modalFormProdutoAdmin').classList.add('hidden');
};

window.salvarProdutoAdmin = async function(e) {
    e.preventDefault();
    const id = document.getElementById('formProdId').value;
    
    const dados = {
        nome: document.getElementById('formProdNome').value.trim(),
        codigo: document.getElementById('formProdCodigo').value.trim(),
        categoria: document.getElementById('formProdCategoria').value.trim(),
        preco: parseFloat(document.getElementById('formProdPreco').value) || 0,
        estoque: parseFloat(document.getElementById('formProdEstoque').value) || 0,
        unidade: document.getElementById('formProdUnidade').value
    };

    if (id) {
        const { error } = await supabase.from('produtos').update(dados).eq('id', id);
        if (error) {
            alert('Erro ao atualizar produto: ' + error.message);
            return;
        }
        alert('Produto atualizado com sucesso!');
    } else {
        if (produtosCacheAdmin.length >= 1000) {
            alert('Limite máximo de 1.000 produtos atingido.');
            return;
        }
        const { error } = await supabase.from('produtos').insert([dados]);
        if (error) {
            alert('Erro ao cadastrar produto: ' + error.message);
            return;
        }
        alert('Produto cadastrado com sucesso!');
    }

    fecharModalProdutoAdmin();
    await carregarProdutosAdmin();
};

window.excluirProdutoAdmin = async function(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) {
        alert('Erro ao excluir: ' + error.message);
    } else {
        await carregarProdutosAdmin();
    }
};

window.ativarScannerAdmin = function() {
    const input = document.getElementById('inputBuscaAdminProdutos');
    if (input) {
        input.focus();
        input.select();
    }
};

window.ativarScannerModal = function() {
    alert('Leitor da câmera do modal ativado.');
};