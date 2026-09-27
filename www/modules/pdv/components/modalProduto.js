// Antes: import { state, produtosCache } from './state.js';
// Depois:
import { state, produtosCache } from '../state.js';

// Renderiza o HTML do Modal de Gerenciamento de Produto (Modo Escuro)
export function renderModalProduto(produto = null) {
    const isEdicao = Boolean(produto && produto.id);

    return `
        <div id="modalProduto" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div class="bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleUp space-y-4">
                
                <!-- Cabeçalho -->
                <div class="flex justify-between items-center border-b border-gray-700 pb-3">
                    <h3 class="font-bold text-base text-white flex items-center gap-2">
                        <i class="fa-solid fa-box text-emerald-500"></i>
                        <span>${isEdicao ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
                    </h3>
                    <button type="button" onclick="window.fecharModalProduto()" class="text-gray-400 hover:text-gray-200 transition">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Formulário -->
                <form id="formProduto" onsubmit="window.salvarProdutoFormulario(event)" class="space-y-3.5">
                    <input type="hidden" id="produtoId" value="${produto?.id || ''}">

                    <div>
                        <label for="nomeProduto" class="block text-xs font-bold text-gray-300 mb-1">Nome do Produto *</label>
                        <input type="text" id="nomeProduto" required value="${produto?.nome || ''}" placeholder="Ex: Refrigerante Guaraná 2L" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>

                    <div>
                        <label for="codigoProduto" class="block text-xs font-bold text-gray-300 mb-1">Código de Barras / SKU</label>
                        <input type="text" id="codigoProduto" value="${produto?.codigo_barras || produto?.codigo || ''}" placeholder="Ex: 7891234567890" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div class="col-span-1">
                            <label for="precoProduto" class="block text-xs font-bold text-gray-300 mb-1">Preço (R$) *</label>
                            <input type="number" step="0.01" id="precoProduto" required value="${produto?.preco || ''}" placeholder="0.00" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>

                        <div class="col-span-1">
                            <label for="estoqueProduto" class="block text-xs font-bold text-gray-300 mb-1">Estoque *</label>
                            <input type="number" step="0.001" id="estoqueProduto" required value="${produto?.estoque ?? ''}" placeholder="0" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>

                        <div class="col-span-1">
                            <label for="unidadeProduto" class="block text-xs font-bold text-gray-300 mb-1">Unidade</label>
                            <select id="unidadeProduto" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="UN" ${produto?.unidade === 'UN' ? 'selected' : ''}>UN</option>
                                <option value="KG" ${produto?.unidade === 'KG' ? 'selected' : ''}>KG</option>
                                <option value="LT" ${produto?.unidade === 'LT' ? 'selected' : ''}>LT</option>
                                <option value="CX" ${produto?.unidade === 'CX' ? 'selected' : ''}>CX</option>
                            </select>
                        </div>
                    </div>

                    <!-- Ações -->
                    <div class="flex space-x-2 pt-3 border-t border-gray-700">
                        <button type="button" onclick="window.fecharModalProduto()" class="w-1/2 bg-gray-700 hover:bg-gray-600 text-gray-200 py-2.5 rounded-xl font-bold text-xs transition">
                            Cancelar
                        </button>
                        <button type="submit" class="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-1">
                            <i class="fa-solid fa-check"></i>
                            <span>Salvar Produto</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    `;
}

// Injeta o modal no DOM dinamicamente
export function abrirModalProduto(produto = null) {
    const container = document.getElementById('containerModaisDinamicos');
    if (!container) return;

    container.innerHTML = renderModalProduto(produto);
}

// Remove o modal do DOM
export function fecharModalProduto() {
    const container = document.getElementById('containerModaisDinamicos');
    if (container) container.innerHTML = '';
}

// Lógica de submissão do formulário
export async function salvarProdutoFormulario(event) {
    event.preventDefault();

    const id = document.getElementById('produtoId').value || null;
    const codigoBarras = document.getElementById('codigoProduto').value.trim();

    const produtoData = {
        id: id,
        nome: document.getElementById('nomeProduto').value.trim(),
        codigo_barras: codigoBarras,
        preco: parseFloat(document.getElementById('precoProduto').value) || 0,
        estoque: parseFloat(document.getElementById('estoqueProduto').value) || 0,
        unidade: document.getElementById('unidadeProduto').value
    };

    // 1. Se for NOVO CADASTRO, verifica o limite do plano
    if (!id && produtosCache.length >= state.plano.limiteProdutos) {
        alert(`Você atingiu o limite de ${state.plano.limiteProdutos} produtos do seu plano atual. Faça o upgrade para cadastrar mais itens!`);
        return; 
    }

    // 2. Verifica se o código de barras já pertence a outro produto cadastrado
    if (codigoBarras) {
        const codigoExistente = produtosCache.find(p => 
            (p.codigo_barras === codigoBarras || p.codigo === codigoBarras) && p.id !== id
        );

        if (codigoExistente) {
            alert(`O código de barras "${codigoBarras}" já está cadastrado no produto "${codigoExistente.nome}". Utilize um código único.`);
            return; 
        }
    }

    try {
        if (window.salvarProdutoNoBanco) {
            await window.salvarProdutoNoBanco(produtoData);
        }

        fecharModalProduto();
        
        if (window.carregarProdutosAdmin) {
            window.carregarProdutosAdmin();
        }
    } catch (error) {
        alert("Erro ao salvar produto: " + error.message);
    }
}

// Exposição das funções para chamadas inline (onclick / onsubmit)
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.salvarProdutoFormulario = salvarProdutoFormulario;