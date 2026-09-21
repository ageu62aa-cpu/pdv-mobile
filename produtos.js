// ==========================================
// MÓDULO DE PRODUTOS E PESAGEM (PDV-VS)
// ==========================================

import { 
    empresaAtualId, produtosCache, produtoEmPesagemAtual, setProdutosCache, 
    setProdutoEmPesagemAtual, itensVenda, setItensVenda 
} from './state.js';
import { atualizarTabelaVenda, focarBusca } from './caixa.js';

// Índice do item selecionado via teclado na lista de sugestões
let indiceItemSelecionadoTeclado = -1;

export async function carregarProdutosCache() {
    if (!empresaAtualId) return;
    const { data, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .eq('empresa_id', empresaAtualId)
        .order('nome', { ascending: true });
        
    if (error) {
        console.error("Erro ao carregar produtos:", error);
        return;
    }
    if (data) setProdutosCache(data);
}

export function aoDigitarBusca(termo) {
    const painel = document.getElementById('painelSugestoes');
    if (!painel) return;
    indiceItemSelecionadoTeclado = -1; // Reseta a seleção ao digitar

    if (termo.length < 2) { painel.classList.add('hidden'); return; }
    
    const termoLower = termo.toLowerCase();
    const filtrados = produtosCache.filter(p => p.nome.toLowerCase().includes(termoLower) || (p.codigo && p.codigo.toLowerCase().includes(termoLower)));
    let html = '';
    filtrados.forEach((p, idx) => {
        const prodString = JSON.stringify(p).replace(/"/g, '&quot;');
        html += `<div id="sugestao-item-${idx}" onclick="window.adicionarItemVendaPorObjeto('${prodString}')" class="p-3 hover:bg-slate-100 cursor-pointer border-b flex justify-between text-sm item-sugestao-busca"> <div><span class="font-semibold text-slate-800">${p.nome}</span><span class="text-xs text-slate-400 block">Cód: ${p.codigo || 'N/A'} | Estoque: ${p.estoque} ${p.unidade === 'KG' ? '<span class="text-amber-600 font-bold">(Por Peso)</span>' : ''}</span></div> <b>R$ ${Number(p.preco).toFixed(2)} ${p.unidade === 'KG' ? '/kg' : ''}</b> </div>`;
    });
    painel.innerHTML = html || '<div class="p-3 text-xs text-slate-400">Nenhum produto encontrado.</div>';
    painel.classList.remove('hidden');
}

export function adicionarItemVendaPorObjeto(prodStr) {
    try {
        const p = JSON.parse(prodStr.replace(/&quot;/g, '"'));
        tratarAdicaoProduto(p);
    } catch(err) {
        console.error("PDV-VS Erro ao parsear item:", err);
    }
}

export function tratarAdicaoProduto(produto) {
    const painel = document.getElementById('painelSugestoes');
    if (painel) painel.classList.add('hidden');
    indiceItemSelecionadoTeclado = -1;
    
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) {
        inputBusca.value = '';
        inputBusca.focus();
    }

    if (produto.unidade === 'KG' || produto.por_peso) {
        abrirModalPesagemManual(produto);
    } else {
        adicionarItemVendaDireto(produto, 1);
    }
}

export function abrirModalPesagemManual(produto) {
    setProdutoEmPesagemAtual(produto);
    let modal = document.getElementById('modalPesagemManual');
    if (!modal) {
        const divModal = document.createElement('div');
        divModal.id = 'modalPesagemManual';
        divModal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
        divModal.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-slate-800 animate-scaleUp">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-slate-900"><i class="fa-solid fa-scale-balanced text-emerald-600 mr-2"></i> Produto por Peso</h3>
                    <button onclick="window.fecharModalPesagemManual()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div class="mb-4 bg-slate-50 p-3 rounded-lg border">
                    <p id="lblNomeProdutoPeso" class="font-bold text-slate-800 text-base"></p>
                    <p id="lblPrecoKgProduto" class="text-xs text-slate-500 mt-1"></p>
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-600 mb-1">PESO NA BALANÇA (KG)</label>
                    <input type="number" step="0.001" id="inputPesoKg" placeholder="Ex: 0.750" oninput="window.calcularValorParcialPeso(this.value)" onkeydown="window.tratarEnterModalPesagem(event)" class="w-full p-3 border rounded-lg text-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div class="mb-5 bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center">
                    <span class="text-xs font-bold text-emerald-800">VALOR TOTAL:</span>
                    <span id="lblValorCalculadoPeso" class="text-xl font-extrabold text-emerald-700">R$ 0,00</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="window.fecharModalPesagemManual()" class="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold text-sm">Cancelar</button>
                    <button onclick="window.confirmarAdicaoPeso()" class="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold text-sm shadow">Adicionar</button>
                </div>
            </div>
        `;
        document.body.appendChild(divModal);
        modal = divModal;
    }

    const lblNome = document.getElementById('lblNomeProdutoPeso');
    const lblPreco = document.getElementById('lblPrecoKgProduto');
    const inputPeso = document.getElementById('inputPesoKg');
    const lblValorCalc = document.getElementById('lblValorCalculadoPeso');

    if (lblNome) lblNome.innerText = produto.nome;
    if (lblPreco) lblPreco.innerText = `Preço por KG: R$ ${Number(produto.preco).toFixed(2)}`;
    if (inputPeso) inputPeso.value = '';
    if (lblValorCalc) lblValorCalc.innerText = 'R$ 0,00';
    if (modal) modal.classList.remove('hidden');
    
    setTimeout(() => {
        if (inputPeso) inputPeso.focus();
    }, 100);
}

export function calcularValorParcialPeso(pesoStr) {
    const peso = parseFloat(pesoStr) || 0;
    const lblValorCalc = document.getElementById('lblValorCalculadoPeso');
    if (produtoEmPesagemAtual && lblValorCalc) {
        const total = peso * produtoEmPesagemAtual.preco;
        lblValorCalc.innerText = `R$ ${total.toFixed(2)}`;
    }
}

export function tratarEnterModalPesagem(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmarAdicaoPeso();
    }
}

export function fecharModalPesagemManual() {
    const modal = document.getElementById('modalPesagemManual');
    if (modal) modal.classList.add('hidden');
    setProdutoEmPesagemAtual(null);
    focarBusca();
}

export function confirmarAdicaoPeso() {
    const inputPeso = document.getElementById('inputPesoKg');
    const peso = inputPeso ? parseFloat(inputPeso.value) || 0 : 0;
    if (peso <= 0) {
        alert('PDV-VS: Informe um peso válido em KG.');
        return;
    }
    if (produtoEmPesagemAtual) {
        adicionarItemVendaDireto(produtoEmPesagemAtual, peso, true);
        fecharModalPesagemManual();
    }
}

export function adicionarItemVendaDireto(produto, qtd, isPeso = false) {
    const existente = itensVenda.find(i => i.id === produto.id && i.isPeso === isPeso); 
    if (existente && !isPeso) { 
        existente.qtd += qtd; 
    } else { 
        setItensVenda([...itensVenda, { 
            ...produto, 
            qtd: qtd, 
            isPeso: isPeso,
            nomeExibicao: isPeso ? `${produto.nome} (${qtd.toFixed(3)} kg)` : produto.nome
        }]); 
    }
    atualizarTabelaVenda();
}

// Navegação por Teclado nas Sugestões de Busca (Setas e Enter)
export function tratarEnterBuscaCaixa(e) {
    const painel = document.getElementById('painelSugestoes');
    const itens = painel ? painel.querySelectorAll('.item-sugestao-busca') : [];

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (itens.length === 0) return;
        indiceItemSelecionadoTeclado = (indiceItemSelecionadoTeclado + 1) % itens.length;
        atualizarDestaqueSugestoes(itens);
        return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (itens.length === 0) return;
        indiceItemSelecionadoTeclado = (indiceItemSelecionadoTeclado - 1 + itens.length) % itens.length;
        atualizarDestaqueSugestoes(itens);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        if (itens.length > 0 && indiceItemSelecionadoTeclado >= 0 && itens[indiceItemSelecionadoTeclado]) {
            itens[indiceItemSelecionadoTeclado].click();
            return;
        }

        const termo = e.target.value.trim().toLowerCase();
        if (!termo) return;
        
        const p = produtosCache.find(prod => (prod.codigo && prod.codigo.toLowerCase() === termo) || prod.nome.toLowerCase() === termo);
        if (p) {
            tratarAdicaoProduto(p);
        } else {
            const pParcial = produtosCache.find(prod => prod.nome.toLowerCase().includes(termo) || (prod.codigo && prod.codigo.toLowerCase().includes(termo)));
            if (pParcial) tratarAdicaoProduto(pParcial);
            else alert('PDV-VS: Produto não encontrado!');
        }
    }
}

function atualizarDestaqueSugestoes(itens) {
    itens.forEach((el, idx) => {
        if (idx === indiceItemSelecionadoTeclado) {
            el.classList.add('bg-emerald-100', 'border-emerald-300');
            el.scrollIntoView({ block: 'nearest' });
        } else {
            el.classList.remove('bg-emerald-100', 'border-emerald-300');
        }
    });
}

// Expondo funções deste módulo para o escopo global
window.carregarProdutosCache = carregarProdutosCache;
window.aoDigitarBusca = aoDigitarBusca;
window.adicionarItemVendaPorObjeto = adicionarItemVendaPorObjeto;
window.fecharModalPesagemManual = fecharModalPesagemManual;
window.calcularValorParcialPeso = calcularValorParcialPeso;
window.tratarEnterModalPesagem = tratarEnterModalPesagem;
window.confirmarAdicaoPeso = confirmarAdicaoPeso;
window.tratarEnterBuscaCaixa = tratarEnterBuscaCaixa;