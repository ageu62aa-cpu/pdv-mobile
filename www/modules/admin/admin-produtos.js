// ==========================================
// GESTÃO DE PRODUTOS DO ADMIN (PDV-VS)
// ==========================================

import { produtosCache } from '../../core/state.js';
import { carregarProdutosCache } from '../../services/produtos.js';
import { resolverEmpresaIdAtual } from './admin-core.js';

export function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contadorProdutos = document.getElementById('contadorLimiteProdutosAdmin');
    
    const limiteMaximo = 1000;
    const qtdAtual = produtosCache.length;
    const vagasDisponiveis = Math.max(0, limiteMaximo - qtdAtual);

    if (contadorProdutos) {
        contadorProdutos.innerText = `${qtdAtual} cadastrados | Restam ${vagasDisponiveis} vagas (Máx: ${limiteMaximo})`;
    }

    if (!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b">
            <td class="p-2 text-xs">${p.codigo || '-'}</td>
            <td class="p-2 font-medium">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-600 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-2">R$ ${Number(p.preco).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-2">${p.estoque} ${p.unidade || 'UN'}</td>
            <td class="p-2 text-center">
                <button onclick="window.abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque}, '${p.unidade || 'UN'}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.excluirProdutoAdmin(${p.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
}

export function filtrarTabelaAdmin(t) { 
    const termo = t.toLowerCase();
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(termo) || (p.codigo && p.codigo.toLowerCase().includes(termo)))); 
}

export function abrirModalNovoProdutoAdmin() {
    if (produtosCache.length >= 1000) {
        alert('PDV-VS - Aviso do Plano: Você atingiu o limite máximo de 1.000 produtos cadastrados.');
        return;
    }
    alternarCamposFormProduto({ id: '', nome: '', codigo: '', preco: '', estoque: '', unidade: 'UN' });
    document.getElementById('modalFormProduto')?.classList.remove('hidden');
}

export function abrirEditarProdutoAdmin(id, nome, cod, preco, est, unidade = 'UN') {
    alternarCamposFormProduto({ id, nome, codigo: cod, preco, estoque: est, unidade });
    document.getElementById('modalFormProduto')?.classList.remove('hidden');
}

function alternarCamposFormProduto(dados) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('formProdId', dados.id);
    setVal('formNome', dados.nome);
    setVal('formCodigo', dados.codigo);
    setVal('formPreco', dados.preco);
    setVal('formEstoque', dados.estoque);
    setVal('formUnidade', dados.unidade);
}

export function fecharFormProduto() { 
    document.getElementById('modalFormProduto')?.classList.add('hidden'); 
}

export async function salvarProdutoAdmin() {
    const idEmpresa = await resolverEmpresaIdAtual();
    if (!idEmpresa) {
        alert('PDV-VS Erro Crítico: ID da empresa não encontrado. Faça login novamente.');
        return;
    }

    const id = document.getElementById('formProdId')?.value || '';
    const p = { 
        empresa_id: idEmpresa,
        nome: document.getElementById('formNome')?.value.trim() || '', 
        codigo: document.getElementById('formCodigo')?.value.trim() || '', 
        preco: parseFloat(document.getElementById('formPreco')?.value) || 0, 
        estoque: parseFloat(document.getElementById('formEstoque')?.value) || 0,
        unidade: document.getElementById('formUnidade')?.value || 'UN'
    };

    if (!p.nome) {
        alert('PDV-VS: Informe o nome do produto.');
        return;
    }
    
    if (id) { 
        const { error } = await window.supabaseClient.from('produtos').update(p).eq('id', id); 
        if (error) { alert('Erro ao atualizar produto: ' + error.message); return; }
    } else { 
        if (produtosCache.length >= 1000) {
            alert('PDV-VS: Limite de 1.000 produtos atingido.');
            return;
        }
        const { error } = await window.supabaseClient.from('produtos').insert([p]); 
        if (error) { alert('Erro ao inserir produto: ' + error.message); return; }
    }
    
    fecharFormProduto(); 
    await carregarProdutosCache(); 
    renderizarTabelaAdmin(produtosCache);
    alert('PDV-VS: Produto salvo com sucesso!');
}

export async function excluirProdutoAdmin(id) { 
    if (confirm('PDV-VS: Deseja excluir este item permanentemente?')) { 
        await window.supabaseClient.from('produtos').delete().eq('id', id); 
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
    } 
}

Object.assign(window, {
    renderizarTabelaAdmin,
    filtrarTabelaAdmin,
    abrirModalNovoProdutoAdmin,
    abrirEditarProdutoAdmin,
    fecharFormProduto,
    salvarProdutoAdmin,
    excluirProdutoAdmin
});