// ==========================================
// MÓDULO DE CAIXA E VENDAS (PDV-VS) - OTIMIZADO
// ==========================================

import { 
    usuarioAtual, empresaAtualId, cargoUsuarioAtual, caixaAberto, faturamentoDia, 
    acaoCaixaAtual, itensVenda, indiceItemParaRemover, setAcaoCaixaAtual, 
    setCaixaAberto, setFaturamentoDia, setIndiceItemParaRemover, setItensVenda, 
    produtosCache, setEmpresaAtualId 
} from './state.js';
import { carregarProdutosCache } from './produtos.js';
import { carregarHistoricoAdmin, carregarOperadoresLoja } from './admin.js';

let valorTrocoAbertura = 0;
let horaAberturaCaixa = null;

// --- UTILITÁRIO DE CLIENTE SUPABASE ---
const getSupabase = () => window.supabaseClient;

// Checagem de status e faturamento do caixa individual
export async function verificarStatusCaixaServidor() {
    if (!empresaAtualId || !usuarioAtual) return;
    try {
        const { data, error } = await getSupabase()
            .from('caixas')
            .select('status, valor_abertura, faturamento_dia')
            .eq('empresa_id', empresaAtualId)
            .eq('user_id', usuarioAtual.id)
            .eq('status', 'ABERTO')
            .maybeSingle();

        if (!error && data) {
            setCaixaAberto(true);
            valorTrocoAbertura = Number(data.valor_abertura) || 0;
            const fatNoBanco = Number(data.faturamento_dia) || 0;

            if (fatNoBanco !== faturamentoDia) {
                setFaturamentoDia(fatNoBanco);
                const txtFat = document.getElementById('txtFaturamentoDia');
                if (txtFat) txtFat.innerText = `R$ ${fatNoBanco.toFixed(2)}`;
            }
        } else {
            setCaixaAberto(false);
        }
        atualizarBadgesCaixaInterface();

        if (cargoUsuarioAtual === 'admin_mercado') {
            carregarOperadoresLoja?.();
            carregarHistoricoAdmin?.();
        }
    } catch (err) {
        console.error('PDV-VS: Erro ao verificar status do caixa no servidor:', err);
    }
}

// Configuração de Tempo Real (Supabase Realtime)
export function iniciarRealtimeCaixa() {
    if (!empresaAtualId) return;
    
    getSupabase()
        .channel('escuta_mudancas_caixa')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'caixas', filter: `empresa_id=eq.${empresaAtualId}` },
            (payload) => {
                if (payload.new && payload.new.user_id === usuarioAtual?.id) {
                    const novoStatus = payload.new.status === 'ABERTO';
                    const novoFat = Number(payload.new.faturamento_dia) || 0;
                    valorTrocoAbertura = Number(payload.new.valor_abertura) || 0;

                    if (novoStatus !== caixaAberto) {
                        setCaixaAberto(novoStatus);
                        atualizarBadgesCaixaInterface();
                    }

                    if (novoFat !== faturamentoDia) {
                        setFaturamentoDia(novoFat);
                        const txtFat = document.getElementById('txtFaturamentoDia');
                        if (txtFat) txtFat.innerText = `R$ ${novoFat.toFixed(2)}`;
                    }
                }

                if (cargoUsuarioAtual === 'admin_mercado') {
                    carregarOperadoresLoja?.();
                    carregarHistoricoAdmin?.();
                }
            }
        )
        .subscribe();
}

// Atalhos globais e inicialização controlada
window.addEventListener('keydown', (e) => {
    if (e.key === 'F6') {
        e.preventDefault();
        abrirModalCancelarItem();
    }
});

setTimeout(() => {
    iniciarRealtimeCaixa();
    verificarStatusCaixaServidor();
    if (cargoUsuarioAtual === 'admin_mercado') {
        carregarOperadoresLoja?.();
        carregarHistoricoAdmin?.();
    }
}, 500);

window.addEventListener('focus', () => {
    verificarStatusCaixaServidor();
});

export async function atualizarPaginaCompleta() {
    if (confirm('PDV-VS: Deseja atualizar e sincronizar todos os dados do sistema?')) {
        await carregarProdutosCache();
        await verificarStatusCaixaServidor();
        if (cargoUsuarioAtual === 'admin_mercado') {
            await carregarHistoricoAdmin?.();
            await carregarOperadoresLoja?.();
        }
        alert('PDV-VS: Dados sincronizados com sucesso!');
        focarBusca();
    }
}

export async function realizarLogout() { 
    if (caixaAberto) {
        alert('PDV-VS: ATENÇÃO! Você não pode sair do sistema com o caixa individual aberto. Faça o fechamento antes de sair.');
        return;
    }
    if (confirm('PDV-VS: Deseja realmente encerrar a sessão?')) {
        await getSupabase().auth.signOut(); 
        location.reload(); 
    }
}

export function focarBusca() { 
    document.getElementById('inputBusca')?.focus(); 
}

// --- BUSCA E SUGESTÕES ---
export function aoDigitarBusca(e) {
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

// --- MODAL DE CAIXA ---
export function gerenciarCaixaModal(tipo) {
    setAcaoCaixaAtual(tipo);
    const modal = document.getElementById('modalCaixa');
    const tituloModal = document.getElementById('tituloModalCaixa');
    const secaoAbrir = document.getElementById('secaoAbrirCaixa');
    const resumoFechamento = document.getElementById('resumoFechamentoCaixa');
    const inputValorCaixa = document.getElementById('inputValorCaixa');

    if (tituloModal) {
        tituloModal.innerHTML = tipo === 'abrir' 
            ? '<i class="fa-solid fa-cash-register text-emerald-600"></i> Abertura de Caixa (Individual)' 
            : '<i class="fa-solid fa-cash-register text-amber-600"></i> Fechamento de Caixa (Individual)';
    }
    secaoAbrir?.classList.toggle('hidden', tipo === 'fechar');
    resumoFechamento?.classList.toggle('hidden', tipo === 'abrir');
    
    if (tipo === 'fechar') {
        const valFatOp = document.getElementById('valFaturamentoOperador');
        const valTrocoInicial = document.getElementById('valTrocoInicialCaixa');
        const valTotalGeral = document.getElementById('valTotalGeralCaixa');
        
        if (valFatOp) valFatOp.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
        if (valTrocoInicial) valTrocoInicial.innerText = `R$ ${(valorTrocoAbertura || 0).toFixed(2)}`;
        if (valTotalGeral) valTotalGeral.innerText = `R$ ${(faturamentoDia + (valorTrocoAbertura || 0)).toFixed(2)}`;
    } else if (inputValorCaixa) {
        inputValorCaixa.value = '';
    }
    
    modal?.classList.remove('hidden');
    setTimeout(() => {
        if (tipo === 'abrir' && inputValorCaixa) {
            inputValorCaixa.focus();
        } else {
            document.getElementById('btnConfirmarCaixaModal')?.focus();
        }
    }, 100);
}

export function tratarEnterModalCaixa(e) {
    if (e.key === 'Enter') { e.preventDefault(); confirmarAcaoCaixa(); }
}

export function fecharModalCaixa() { 
    document.getElementById('modalCaixa')?.classList.add('hidden'); 
}

export async function confirmarAcaoCaixa() {
    let idEmpresaAtual = empresaAtualId || localStorage.getItem('empresa_id') || localStorage.getItem('pdv_empresa_id');

    try {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (session?.user) {
            const { data: vincData } = await getSupabase()
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            idEmpresaAtual = vincData?.empresa_id || idEmpresaAtual || session.user.id;
            setEmpresaAtualId(idEmpresaAtual);
            localStorage.setItem('empresa_id', idEmpresaAtual);
        }
    } catch (e) {
        console.error("PDV-VS: Erro ao validar empresa na sessão:", e);
    }

    if (!idEmpresaAtual || !usuarioAtual) {
        alert('PDV-VS: Erro: Sessão do usuário ou empresa não identificada.');
        return;
    }

    const valorDigitado = parseFloat(document.getElementById('inputValorCaixa')?.value) || 0;

    if (acaoCaixaAtual === 'abrir') {
        valorTrocoAbertura = valorDigitado;
        horaAberturaCaixa = new Date();

        const { error } = await getSupabase().from('caixas').upsert({ 
            empresa_id: idEmpresaAtual, user_id: usuarioAtual.id, status: 'ABERTO',
            valor_abertura: valorTrocoAbertura, faturamento_dia: 0,
            data_abertura: new Date().toISOString(), data_fechamento: null, updated_at: new Date().toISOString()
        }, { onConflict: 'empresa_id,user_id,status' });

        if (error) {
            const { error: errInsert } = await getSupabase().from('caixas').insert({ 
                empresa_id: idEmpresaAtual, user_id: usuarioAtual.id, status: 'ABERTO',
                valor_abertura: valorTrocoAbertura, faturamento_dia: 0, data_abertura: new Date().toISOString()
            });
            if (errInsert) {
                alert('PDV-VS: Erro ao salvar abertura do caixa: ' + errInsert.message);
                return;
            }
        }

        setCaixaAberto(true);
        setFaturamentoDia(0);
        alert('PDV-VS: Caixa aberto com sucesso!');
    } else {
        const horaFechamento = new Date();
        const totalGeralGaveta = faturamentoDia + (valorTrocoAbertura || 0);
        
        alert(`PDV-VS: Caixa Fechado com Sucesso!\n- Abertura: ${horaAberturaCaixa?.toLocaleTimeString() || 'N/A'}\n- Fechamento: ${horaFechamento.toLocaleTimeString()}\n- Troco Inicial: R$ ${(valorTrocoAbertura || 0).toFixed(2)}\n- Vendas: R$ ${faturamentoDia.toFixed(2)}\n- Total em Gaveta: R$ ${totalGeralGaveta.toFixed(2)}`);
        
        await getSupabase().from('caixas').update({ 
            status: 'FECHADO', valor_fechamento: totalGeralGaveta,
            data_fechamento: new Date().toISOString(), updated_at: new Date().toISOString()
        }).eq('empresa_id', idEmpresaAtual).eq('user_id', usuarioAtual.id).eq('status', 'ABERTO');

        setCaixaAberto(false);
        valorTrocoAbertura = 0;
        setFaturamentoDia(0);
        const txtFat = document.getElementById('txtFaturamentoDia');
        if (txtFat) txtFat.innerText = 'R$ 0,00';
    }
    
    atualizarBadgesCaixaInterface();
    if (cargoUsuarioAtual === 'admin_mercado') {
        carregarOperadoresLoja?.();
        carregarHistoricoAdmin?.();
    }
    fecharModalCaixa();
    focarBusca();
}

export function atualizarBadgesCaixaInterface() {
    document.querySelectorAll('.badgeCaixaStatus').forEach(b => {
        b.innerText = caixaAberto ? 'ABERTO' : 'FECHADO';
        b.className = caixaAberto 
            ? 'badgeCaixaStatus text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded font-semibold' 
            : 'badgeCaixaStatus text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded font-semibold';
    });
}

// --- SEGURANÇA E PIN GERENCIAL ---
export function salvarPinAdmin() {
    const pin = document.getElementById('inputAdminPinConfig')?.value.trim() || '';
    if (!pin || pin.length < 4) { alert('PDV-VS: Informe um PIN válido de pelo menos 4 dígitos.'); return; }
    localStorage.setItem('pdv_admin_pin_' + empresaAtualId, pin); 
    alert('PDV-VS: PIN gerencial atualizado com sucesso!');
}

export function solicitarRemocaoItem(i) {
    setIndiceItemParaRemover(i); 
    const inputPinAuth = document.getElementById('inputPinAutorizacion');
    if (inputPinAuth) inputPinAuth.value = '';
    document.getElementById('modalAutorizacaoAdmin')?.classList.remove('hidden');
    setTimeout(() => inputPinAuth?.focus(), 100);
}

export function tratarEnterModalAutorizacao(e) {
    if (e.key === 'Enter') { e.preventDefault(); confirmarAutorizacaoPin(); }
}

export function confirmarAutorizacaoPin() {
    const inputPinAuth = document.getElementById('inputPinAutorizacion');
    const pin = inputPinAuth?.value.trim() || '';
    const pinSalvo = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    
    if (pin === pinSalvo) {
        if (indiceItemParaRemover !== null) { 
            itensVenda.splice(indiceItemParaRemover, 1); 
            atualizarTabelaVenda(); 
        }
        fecharModalAutorizacao();
    } else { 
        alert('PDV-VS: PIN gerencial incorreto!'); 
        if (inputPinAuth) { inputPinAuth.value = ''; inputPinAuth.focus(); }
    }
}

export function fecharModalAutorizacao() { 
    document.getElementById('modalAutorizacaoAdmin')?.classList.add('hidden'); 
    focarBusca();
}

export function abrirModalCancelarItem() {
    if (itensVenda.length === 0) { alert('PDV-VS: Não há itens na venda.'); return; }
    let html = '';
    itensVenda.forEach((item, index) => {
        html += `<div class="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b" onclick="fecharModalCancelarItem(); window.solicitarRemocaoItem(${index});"> <div><span class="font-semibold text-slate-800">${item.nome}</span></div> <button class="text-rose-600 text-xs border border-rose-200 rounded px-2 py-1">Remover</button> </div>`;
    });
    const listaCancelar = document.getElementById('listaItensParaCancelar');
    if (listaCancelar) listaCancelar.innerHTML = html;
    document.getElementById('modalCancelarItem')?.classList.remove('hidden');
}

export function fecharModalCancelarItem() { 
    document.getElementById('modalCancelarItem')?.classList.add('hidden'); 
    focarBusca();
}

export function cancelarVenda() { 
    if (confirm('PDV-VS: Deseja realmente cancelar toda a compra?')) { 
        setItensVenda([]); 
        atualizarTabelaVenda(); 
    } 
}

// --- FINALIZAÇÃO DE VENDAS E ESTOQUE ---
export async function finalizarVenda() {
    if (!caixaAberto) { alert('PDV-VS: O caixa individual precisa estar aberto! Pressione [F1] ou abra o caixa.'); return; }
    if (itensVenda.length === 0) { alert('PDV-VS: Adicione produtos antes de finalizar.'); return; }
    
    const total = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    
    const { error } = await getSupabase().from('vendas').insert([{ 
        empresa_id: empresaAtualId, operador: usuarioAtual.email, valor_total: total, itens: itensVenda 
    }]);
    
    if (error) { alert('PDV-VS: Erro ao registrar venda: ' + error.message); return; }

    for (const item of itensVenda) {
        const novoEstoque = Math.max(0, (item.estoque || 0) - item.qtd);
        await getSupabase().from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
    }

    const novoFat = faturamentoDia + total;
    setFaturamentoDia(novoFat); 
    const txtFat = document.getElementById('txtFaturamentoDia');
    if (txtFat) txtFat.innerText = `R$ ${novoFat.toFixed(2)}`;

    if (empresaAtualId && usuarioAtual) {
        await getSupabase().from('caixas').update({ 
            faturamento_dia: novoFat, updated_at: new Date().toISOString()
        }).eq('empresa_id', empresaAtualId).eq('user_id', usuarioAtual.id).eq('status', 'ABERTO');
    }

    setItensVenda([]); 
    atualizarTabelaVenda(); 
    await carregarProdutosCache();
    
    if (cargoUsuarioAtual === 'admin_mercado') {
        carregarOperadoresLoja?.();
        carregarHistoricoAdmin?.();
    }
    alert('PDV-VS: Venda concluída e estoque atualizado com sucesso!');
    focarBusca();
}

export function atualizarTabelaVenda() {
    const tbody = document.getElementById('tabelaItensVenda');
    const contador = document.getElementById('contadorItens');
    const txtSubtotal = document.getElementById('txtSubtotal');
    const txtTotal = document.getElementById('txtTotal');

    if (contador) contador.innerText = `${itensVenda.length} itens`;
    if (!tbody) return;

    if (itensVenda.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto adicionado na venda.</td></tr>'; 
        if (txtSubtotal) txtSubtotal.innerText = 'R$ 0,00'; 
        if (txtTotal) txtTotal.innerText = 'R$ 0,00'; 
        return; 
    }
    
    let html = '', total = 0;
    itensVenda.forEach((item, i) => {
        const subtotalItem = item.qtd * item.preco;
        total += subtotalItem;
        
        const qtdDisplay = item.isPeso 
            ? `<span class="text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded">${item.qtd.toFixed(3)} kg</span>` 
            : `<input type="number" min="1" value="${item.qtd}" onchange="window.alterarQtd(${i}, this.value)" class="w-14 text-center border rounded">`;

        html += `<tr class="border-b">
            <td class="p-2">${item.nome} ${item.isPeso ? '<span class="text-[10px] text-amber-600 block">Pesado (Baixa por Peso)</span>' : ''}</td>
            <td class="p-2">${qtdDisplay}</td>
            <td class="p-2">R$ ${Number(item.preco).toFixed(2)}${item.isPeso ? '/kg' : ''}</td>
            <td class="p-2 font-bold">R$ ${subtotalItem.toFixed(2)}</td>
            <td class="p-2 text-center"><button onclick="window.solicitarRemocaoItem(${i})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    if (txtSubtotal) txtSubtotal.innerText = `R$ ${total.toFixed(2)}`;
    if (txtTotal) txtTotal.innerText = `R$ ${total.toFixed(2)}`;
}

export function alterarQtd(i, qtd) { 
    const q = parseFloat(qtd); 
    if (q > 0) { itensVenda[i].qtd = q; atualizarTabelaVenda(); } 
}

// ==========================================
// EXPOSIÇÃO GLOBAL UNIFICADA (WINDOW)
// ==========================================
Object.assign(window, {
    verificarStatusCaixaServidor, iniciarRealtimeCaixa, atualizarPaginaCompleta,
    realizarLogout, focarBusca, aoDigitarBusca, tratarEnterBuscaCaixa,
    gerenciarCaixaModal, tratarEnterModalCaixa, fecharModalCaixa, confirmarAcaoCaixa,
    atualizarBadgesCaixaInterface, salvarPinAdmin, solicitarRemocaoItem,
    tratarEnterModalAutorizacao, confirmarAutorizacaoPin, fecharModalAutorizacao,
    abrirModalCancelarItem, fecharModalCancelarItem, cancelarVenda, finalizarVenda,
    atualizarTabelaVenda, alterarQtd
});