// ==========================================
// MÓDULO DE OPERAÇÕES E SEGURANÇA DO CAIXA (PDV-VS)
// ==========================================

import { 
    usuarioAtual, empresaAtualId, cargoUsuarioAtual, caixaAberto, faturamentoDia, 
    acaoCaixaAtual, itensVenda, indiceItemParaRemover, setAcaoCaixaAtual, 
    setCaixaAberto, setFaturamentoDia, setIndiceItemParaRemover, setEmpresaAtualId 
} from '../../core/state.js';
import { carregarProdutosCache } from '../../services/produtos.js';
import { carregarHistoricoAdmin, carregarOperadoresLoja } from '../admin/admin-core.js';
import { valorTrocoAbertura, horaAberturaCaixa, getSupabase, atualizarBadgesCaixaInterface } from './caixa-core.js';
import { focarBusca, atualizarTabelaVenda } from './caixa-vendas.js';

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

Object.assign(window, {
    gerenciarCaixaModal, tratarEnterModalCaixa, fecharModalCaixa, confirmarAcaoCaixa,
    salvarPinAdmin, solicitarRemocaoItem, tratarEnterModalAutorizacao,
    confirmarAutorizacaoPin, fecharModalAutorizacao
});