// ==========================================
// MÓDULO DE BUSCA E LEITURA DE PRODUTOS (PDV-VS)
// ==========================================

import { produtosCache } from '../../core/state.js';

export function focarBusca() { 
    document.getElementById('inputBusca')?.focus(); 
}

export function aoDigitarBusca(e) {
    if (!e || !e.target) return;
    
    const termo = e.target.value.trim().toLowerCase();
    const suggestionsBox = document.getElementById('sugestoesBusca');
    
    if (!suggestionsBox) return;

    if (!termo) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
    }

    const filtrados = produtosCache.filter(p => 
        (p.nome && p.nome.toLowerCase().includes(termo)) || 
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo))
    );

    if (filtrados.length === 0) {
        suggestionsBox.innerHTML = '<div class="p-2 text-slate-400 text-sm">Nenhum produto encontrado.</div>';
        suggestionsBox.classList.remove('hidden');
        return;
    }

    let html = '';
    filtrados.slice(0, 10).forEach(prod => {
        html += `<div class="p-2 hover:bg-slate-100 cursor-pointer border-b flex justify-between items-center" onclick="window.adicionarProdutoPorId('${prod.id}')">
            <span class="font-medium text-slate-700">${prod.nome}</span>
            <span class="text-xs text-emerald-600 font-bold">R$ ${Number(prod.preco_venda || prod.preco || 0).toFixed(2)}</span>
        </div>`;
    });
    
    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.remove('hidden');
}

export function tratarEnterBuscaCaixa(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = document.getElementById('inputBusca');
        if (!input) return;
        const valor = input.value.trim();
        
        const encontrado = produtosCache.find(p => p.codigo_barras === valor || p.id === valor);
        if (encontrado) {
            window.adicionarProdutoAoCarrinho?.(encontrado);
            input.value = '';
            document.getElementById('sugestoesBusca')?.classList.add('hidden');
        } else {
            alert('PDV-VS: Produto não encontrado pelo código digitado.');
        }
    }
}

Object.assign(window, {
    focarBusca, aoDigitarBusca, tratarEnterBuscaCaixa
});