// Renderiza o HTML do Modal de Gerenciamento de Produto
export function renderModalProduto(produto = null) {
    const isEdicao = Boolean(produto && produto.id);

    return `
        <div id="modalProduto" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleUp space-y-4">
                
                <!-- Cabeçalho -->
                <div class="flex justify-between items-center border-b pb-3">
                    <h3 class="font-bold text-base text-slate-900 flex items-center gap-2">
                        <i class="fa-solid fa-box text-emerald-600"></i>
                        <span>${isEdicao ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
                    </h3>
                    <button type="button" onclick="window.fecharModalProduto()" class="text-slate-400 hover:text-slate-600 transition">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Formulário -->
                <form id="formProduto" onsubmit="window.salvarProdutoFormulario(event)" class="space-y-3.5">
                    <input type="hidden" id="produtoId" value="${produto?.id || ''}">

                    <div>
                        <label for="nomeProduto" class="block text-xs font-bold text-slate-700 mb-1">Nome do Produto *</label>
                        <input type="text" id="nomeProduto" required value="${produto?.nome || ''}" placeholder="Ex: Refrigerante Guaraná 2L" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>

                    <div>
                        <label for="codigoProduto" class="block text-xs font-bold text-slate-700 mb-1">Código de Barras / SKU</label>
                        <input type="text" id="codigoProduto" value="${produto?.codigo_barras || ''}" placeholder="Ex: 7891234567890" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>

                    <div class="grid grid-cols-3 gap-2">
                        <div class="col-span-1">
                            <label for="precoProduto" class="block text-xs font-bold text-slate-700 mb-1">Preço (R$) *</label>
                            <input type="number" step="0.01" id="precoProduto" required value="${produto?.preco || ''}" placeholder="0.00" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>

                        <div class="col-span-1">
                            <label for="estoqueProduto" class="block text-xs font-bold text-slate-700 mb-1">Estoque *</label>
                            <input type="number" step="0.001" id="estoqueProduto" required value="${produto?.estoque ?? ''}" placeholder="0" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>

                        <div class="col-span-1">
                            <label for="unidadeProduto" class="block text-xs font-bold text-slate-700 mb-1">Unidade</label>
                            <select id="unidadeProduto" class="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="UN" ${produto?.unidade === 'UN' ? 'selected' : ''}>UN</option>
                                <option value="KG" ${produto?.unidade === 'KG' ? 'selected' : ''}>KG</option>
                                <option value="LT" ${produto?.unidade === 'LT' ? 'selected' : ''}>LT</option>
                                <option value="CX" ${produto?.unidade === 'CX' ? 'selected' : ''}>CX</option>
                            </select>
                        </div>
                    </div>

                    <!-- Ações -->
                    <div class="flex space-x-2 pt-3 border-t">
                        <button type="button" onclick="window.fecharModalProduto()" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition">
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

    const produtoData = {
        id: document.getElementById('produtoId').value || null,
        nome: document.getElementById('nomeProduto').value.trim(),
        codigo_barras: document.getElementById('codigoProduto').value.trim(),
        preco: parseFloat(document.getElementById('precoProduto').value) || 0,
        estoque: parseFloat(document.getElementById('estoqueProduto').value) || 0,
        unidade: document.getElementById('unidadeProduto').value
    };

    try {
        // Exemplo: Salvar no Supabase ou Estado Local
        if (window.salvarProdutoNoBanco) {
            await window.salvarProdutoNoBanco(produtoData);
        }

        fecharModalProduto();
        
        // Recarrega a tabela de produtos do Admin, se a função existir
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