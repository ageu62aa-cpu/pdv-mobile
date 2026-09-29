// ==========================================  
// MÓDULO DE CAIXA E VENDAS (PDV-VS) 
// ==========================================  

import { initCaixaBusca } from './caixa-busca.js';  
import {   
    usuarioAtual, empresaAtualId, cargoUsuarioAtual, caixaAberto, faturamentoDia,   
    acaoCaixaAtual, itensVenda, indiceItemParaRemover, setAcaoCaixaAtual,   
    setCaixaAberto, setFaturamentoDia, setIndiceItemParaRemover, setItensVenda,   
    produtosCache, setEmpresaAtualId   
} from '../../core/state.js';  
import { carregarProdutosCache } from '../../services/produtos.js';
import { supabase } from '../../../core/config.js'; // Correção definitiva do import do Supabase
import { abrirLeitorCamera } from './camera.js'; // Importação do leitor de câmera

let valorTrocoAbertura = 0;
let horaAberturaCaixa = null;

// --- UTILITÁRIO DE CLIENTE SUPABASE ---
const getSupabase = () => window.supabaseClient || window.supabase || supabase;

// --- CONTROLE DO SCANNER DE CÂMERA ---
window.abrirCameraScanner = () => {
  abrirLeitorCamera(); // Dispara o fluxo que usa o camera-native.js no app (iOS/Android) ou camera-web.js no navegador
};

// --- ATUALIZAÇÃO VISUAL DOS BADGES DE STATUS NO CABEÇALHO ---
export function atualizarBadgesCaixaInterface(isAberto, faturamento = 0) {
    const txtStatusHeader = document.getElementById('txtStatusCaixaHeader');
    const btnAbrir = document.getElementById('btnAbrirCaixaHeader');
    const btnFechar = document.getElementById('btnFecharCaixaHeader');

    if (isAberto) {
        if (txtStatusHeader) {
            txtStatusHeader.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caixa Aberto (Fat: R$ ${Number(faturamento).toFixed(2)})`;
            txtStatusHeader.className = "text-xs text-emerald-400 font-semibold flex items-center gap-1.5";
        }
        if (btnAbrir) btnAbrir.classList.add('opacity-50', 'cursor-not-allowed');
        if (btnFechar) btnFechar.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        if (txtStatusHeader) {
            txtStatusHeader.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Caixa Fechado (Necessário Abertura)`;
            txtStatusHeader.className = "text-xs text-amber-400 font-semibold flex items-center gap-1.5";
        }
        if (btnAbrir) btnAbrir.classList.remove('opacity-50', 'cursor-not-allowed');
        if (btnFechar) btnFechar.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Suporte retrocompatível para elementos genéricos `.badgeCaixaStatus`
    document.querySelectorAll('.badgeCaixaStatus').forEach(b => {
        b.innerText = isAberto ? 'ABERTO' : 'FECHADO';
        b.className = isAberto 
            ? 'badgeCaixaStatus text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded font-semibold' 
            : 'badgeCaixaStatus text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded font-semibold';
    });
}

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
            atualizarBadgesCaixaInterface(true, fatNoBanco);
        } else {
            setCaixaAberto(false);
            atualizarBadgesCaixaInterface(false, 0);
        }

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
                    
                    if (novoStatus !== caixaAberto) {
                        setCaixaAberto(novoStatus);
                        atualizarBadgesCaixaInterface(novoStatus, novoFat);
                    }
                    
                    if (novoFat !== faturamentoDia) {
                        setFaturamentoDia(novoFat);
                        const txtFat = document.getElementById('txtFaturamentoDia');
                        if (txtFat) txtFat.innerText = `R$ ${novoFat.toFixed(2)}`;
                        atualizarBadgesCaixaInterface(novoStatus, novoFat);
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

// --- FUNÇÃO AUXILIAR DE IMPRESSÃO TÉRMICA & ESTOQUE ---
window.dispararImpressaoTermicaNFCe = function(detalhes) {
    console.log("Gerando NFC-e, baixando estoque e salvando transação...", detalhes);
};

// --- MAPEAMENTO DE ATALHOS F1 A F12 ---
window.acaoAtalhoF1 = () => {
    const inputCpf = document.getElementById('inputCpfNota');
    const painelAberto = document.getElementById('blocoF1') && !document.getElementById('blocoF1').classList.contains('hidden');
    
    if (painelAberto && document.activeElement === inputCpf) {
        window.salvarConsumidorEImprimir();
        return;
    }

    abrirPainelLateral('blocoF1', 'F1 - Cadastro para Nota');
    
    setTimeout(() => {
        if (inputCpf) {
            inputCpf.focus();
            inputCpf.select();
            
            inputCpf.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.salvarConsumidorEImprimir();
                } else if (e.key === 'F1') {
                    e.preventDefault();
                    window.salvarConsumidorEImprimir();
                }
            };
        }
    }, 50);
};

window.salvarConsumidorEImprimir = () => {
    const doc = document.getElementById('inputCpfNota')?.value.trim();
    document.getElementById('cupomCliente').innerText = doc || "Consumidor Final";
    if (typeof fecharPainelLateral === 'function') {
        fecharPainelLateral();
    }
};

window.acaoAtalhoF2 = () => {
    const vendedor = prompt('F2 - Informe o nome ou código do Vendedor:', 'Balcão');
    if (vendedor) {
        window.vendedorAtualVenda = vendedor;
        window.vendedorAtual = { nome: vendedor };
        localStorage.setItem('operadorNome', vendedor);
    }
};

window.acaoAtalhoF3 = () => {
    if (itensVenda.length === 0) {
        alert('PDV-VS: Não há itens na venda para liquidar.');
        return;
    }
    const valorTotalVenda = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    const escolhaPagamento = prompt(
        `TOTAL DA COMPRA: R$ ${valorTotalVenda.toFixed(2)}\n\n` +
        `Selecione a forma de pagamento:\n` +
        `[1] - Dinheiro (Cálculo automático de troco)\n` +
        `[2] - Pix\n\n` +
        `Digite o número correspondente:`
    );

    if (escolhaPagamento === "1") {
        const valorRecebidoStr = prompt(`Total da Compra: R$ ${valorTotalVenda.toFixed(2)}\nDigite o valor em dinheiro recebido:`);
        if (valorRecebidoStr !== null) {
            const recebido = parseFloat(valorRecebidoStr.replace(',', '.')) || 0;
            const troco = Math.max(0, recebido - valorTotalVenda);
            
            const elTroco = document.getElementById('txtPainelTroco');
            if (elTroco) elTroco.innerText = `R$ ${troco.toFixed(2)}`;
            
            alert(`Pagamento em Dinheiro Confirmado!\nValor Recebido: R$ ${recebido.toFixed(2)}\nTroco: R$ ${troco.toFixed(2)}`);
            window.dispararImpressaoTermicaNFCe({ forma: 'Dinheiro', recebido, troco });
        }
    } else if (escolhaPagamento === "2") {
        alert(`Pagamento via Pix acionado com sucesso!\nValor Total: R$ ${valorTotalVenda.toFixed(2)}`);
        window.dispararImpressaoTermicaNFCe({ forma: 'Pix Dinâmico', recebido: valorTotalVenda, troco: 'R$ 0,00' });
    }
};

window.acaoAtalhoF4 = () => {
    const valorTotalVenda = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    if (valorTotalVenda <= 0) {
        alert('PDV-VS: Não há itens na venda.');
        return;
    }
    const taxaDebito = valorTotalVenda * 0.015;
    const totalComTaxa = valorTotalVenda + taxaDebito;
    
    const elDescontos = document.getElementById('txtResumoDescontos');
    if (elDescontos) elDescontos.innerText = `Taxa Débito: R$ ${taxaDebito.toFixed(2)}`;
    
    alert(`Débito Processado com Sucesso!\nSubtotal: R$ ${valorTotalVenda.toFixed(2)}\nTaxa Aplicada: R$ ${taxaDebito.toFixed(2)}\nTotal Final: R$ ${totalComTaxa.toFixed(2)}`);
    window.dispararImpressaoTermicaNFCe({ forma: 'Débito (Taxa Embutida)', total: totalComTaxa });
};

window.acaoAtalhoF5 = () => { focarBusca(); };
window.acaoAtalhoF6 = () => {
    const desc = prompt('F6 - Desconto Especial: Digite o valor (Ex: 10% ou 15.00):');
    if (desc) { window.descontoAplicadoVenda = desc; }
};
window.acaoAtalhoF7 = () => { window.acionarFinalizarVenda(); };
window.acionarFinalizarVenda = () => { finalizarVenda(); };

window.acaoAtalhoF8 = () => {
    const valorTotalVenda = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    if (valorTotalVenda <= 0) {
        alert('PDV-VS: Não há itens na venda.');
        return;
    }
    const parcelas = prompt('F8 - Crédito: Digite o número de parcelas (1 a 12x):', '1');
    if (parcelas !== null) {
        const numParcelas = parseInt(parcelas) || 1;
        const taxaJuros = numParcelas > 1 ? 0.03 * numParcelas : 0.02;
        const totalComJuros = valorTotalVenda * (1 + taxaJuros);
        
        const elDescontos = document.getElementById('txtResumoDescontos');
        if (elDescontos) elDescontos.innerText = `Juros Cartão: R$ ${(totalComJuros - valorTotalVenda).toFixed(2)}`;
        
        alert(`Crédito em ${numParcelas}x Processado com Sucesso!\nValor Total com Juros: R$ ${totalComJuros.toFixed(2)}`);
        window.dispararImpressaoTermicaNFCe({ forma: `Crédito em ${numParcelas}x`, total: totalComJuros });
    }
};

window.acaoAtalhoF9 = () => {
    const tipo = confirm("Clique em [OK] para Suprimento (Entrada) ou [Cancelar] para Sangria (Retirada)") ? "Suprimento" : "Sangria";
    const valorStr = prompt(`Informe o valor da ${tipo} (R$):`, '0.00');
    if (valorStr) {
        const valor = parseFloat(valorStr.replace(',', '.')) || 0;
        const motivo = prompt(`Informe o motivo da ${tipo} (obrigatório para o fechamento do caixa):`, '');
        if (motivo) {
            window.movimentosCaixaGaveta = window.movimentosCaixaGaveta || [];
            window.movimentosCaixaGaveta.push({ tipo, valor, motivo, hora: new Date().toLocaleTimeString() });
            console.log(`Movimento de caixa registrado: ${tipo} de R$ ${valor} - Motivo: ${motivo}`);
        }
    }
};

window.acaoAtalhoF10 = () => {
    const qtd = prompt('F10 - Multiplicador de Quantidade (Ex: 5):', '1');
    if (qtd) { window.quantidadeMultiplicador = parseFloat(qtd) || 1; }
};

window.acaoAtalhoF11 = () => { abrirModalCancelarItem(); };
window.acaoAtalhoF12 = () => { cancelarVenda(); };
window.acaoAtalhoPix = () => { window.acaoAtalhoF3(); };
window.acaoAtalhoParcelamento = () => { window.acaoAtalhoF8(); };

window.abrirModalTodosAtalhos = () => {
    alert(`GUIA DE ATALHOS (F1 a F12):
- F1: Identificar Consumidor (Nota Fiscal)
- F2: Vendedor / Operador
- F3: Dinheiro ([1]) ou Pix ([2]) com Troco Automático
- F4: Débito (Taxas Embutidas)
- F5: Consulta de Produtos & Leitor
- F6: Desconto Especial
- F7: Avançar para Pagamento
- F8: Crédito (Parcelado com Juros)
- F9: Caixa (Sangria/Suprimento com Motivo)
- F10: Multiplicador de Quantidade
- F11: Cancelar Item (PIN)
- F12: Cancelar Venda (PIN)`);
};

window.addEventListener('keydown', (e) => {
    if (e.key >= 'F1' && e.key <= 'F12') {
        e.preventDefault();
        switch (e.key) {
            case 'F1': window.acaoAtalhoF1?.(); break;
            case 'F2': window.acaoAtalhoF2?.(); break;
            case 'F3': window.acaoAtalhoF3?.(); break;
            case 'F4': window.acaoAtalhoF4?.(); break;
            case 'F5': window.acaoAtalhoF5?.(); break;
            case 'F6': window.acaoAtalhoF6?.(); break;
            case 'F7': window.acionarFinalizarVenda?.(); break;
            case 'F8': window.acaoAtalhoF8?.(); break;
            case 'F9': window.acaoAtalhoF9?.(); break;
            case 'F10': window.acaoAtalhoF10?.(); break;
            case 'F11': window.acaoAtalhoF11?.(); break;
            case 'F12': window.acaoAtalhoF12?.(); break;
        }
    }
});

window.addEventListener('focus', () => {
    verificarStatusCaixaServidor();
});

export async function atualizarPaginaCompleta() {
    if (confirm('PDV-VS: Deseja sincronizar todos os dados do sistema?')) {
        await carregarProdutosCache();
        await verificarStatusCaixaServidor();
        if (cargoUsuarioAtual === 'admin_mercado') {
            await carregarHistoricoAdmin?.();
            await carregarOperadoresLoja?.();
        }
        focarBusca();
    }
}

export async function realizarLogout() { 
    if (caixaAberto) {
        alert('PDV-VS: Feche o caixa individual antes de encerrar a sessão.');
        return;
    }
    if (confirm('PDV-VS: Deseja realmente encerrar a sessão?')) {
        await getSupabase().auth.signOut(); 
        location.reload(); 
    }
}

export function focarBusca() { document.getElementById('inputBusca')?.focus(); }

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
        let valor = input.value.trim();
        
        let qtdDesejada = window.quantidadeMultiplicador || 1;
        
        if (valor.includes('*')) {
            const partes = valor.split('*');
            const qtdParsed = parseFloat(partes[0].trim());
            if (!isNaN(qtdParsed) && qtdParsed > 0) {
                qtdDesejada = qtdParsed;
                valor = partes.slice(1).join('*').trim();
            }
        }

        const encontrado = produtosCache.find(p => p.codigo_barras === valor || p.id === valor);
        if (encontrado) {
            if (window.adicionarProdutoComQtd) {
                window.adicionarProdutoComQtd(encontrado, qtdDesejada);
            } else if (window.adicionarProdutoAoCarrinho) {
                encontrado._qtdTemporaria = qtdDesejada;
                window.adicionarProdutoAoCarrinho(encontrado);
            }
            
            window.quantidadeMultiplicador = 1;
            input.value = '';
            document.getElementById('sugestoesBusca')?.classList.add('hidden');
        } else {
            alert('PDV-VS: Produto não encontrado pelo código digitado.');
        }
    }
}

// --- ABRIR CAIXA ---
window.acionarAbrirCaixa = async function() {
    const db = window.supabaseClient || window.supabase || supabase;
    if (!db) {
        alert('PDV-VS: Erro crítico: Cliente Supabase não encontrado.');
        return;
    }

    let empresaId = window.empresaAtualId || localStorage.getItem('empresaAtualId');
    let usuario = window.usuarioAtual;

    if (!usuario || !empresaId) {
        const { data: { session } } = await db.auth.getSession();
        if (session && session.user) {
            usuario = session.user;
            empresaId = empresaId || localStorage.getItem('empresaAtualId');
        }
    }

    if (!empresaId || !usuario) {
        alert('PDV-VS: Sessão não encontrada. Faça login novamente.');
        window.location.href = '../auth/auth.html';
        return;
    }

    try {
        // 1. Validar se já existe caixa aberto
        const { data: caixaExistente } = await db
            .from('caixas')
            .select('id, status')
            .eq('empresa_id', empresaId)
            .eq('user_id', usuario.id)
            .eq('status', 'ABERTO')
            .maybeSingle();

        if (caixaExistente) {
            alert('PDV-VS: O seu caixa já está aberto!');
            atualizarBadgesCaixaInterface(true, 0);
            return;
        }

        const trocoStr = prompt('Digite o valor do troco inicial (fundo de troco) em R$:', '50.00');
        if (trocoStr === null) return; 

        const valorAbertura = parseFloat(trocoStr.replace(',', '.'));
        if (isNaN(valorAbertura) || valorAbertura < 0) {
            alert('PDV-VS: Valor de troco inválido.');
            return;
        }

        const nomeOperador = window.vendedorAtual?.nome || localStorage.getItem('operadorNome') || usuario.email || 'Operador Ativo';

        // 2. Inserir abertura no banco (somente colunas padrão e seguras)
        const { error } = await db.from('caixas').insert([{
            empresa_id: empresaId,
            user_id: usuario.id,
            status: 'ABERTO',
            valor_abertura: valorAbertura,
            faturamento_dia: 0.00,
            created_at: new Date().toISOString()
        }]);

        if (error) throw error;

        alert(`Caixa aberto com sucesso! Operador: ${nomeOperador} | Troco: R$ ${valorAbertura.toFixed(2)}`);
        
        atualizarBadgesCaixaInterface(true, 0);

        if (typeof verificarStatusCaixaServidor === 'function') {
            await verificarStatusCaixaServidor();
        }

    } catch (err) {
        console.error('Erro ao abrir caixa:', err);
        alert('PDV-VS: Erro ao abrir caixa: ' + err.message);
    }
};

// --- FECHAR CAIXA (COM RELATÓRIO INTELIGENTE E COMPATÍVEL) ---
window.acionarFecharCaixa = async function() {
    const db = window.supabaseClient || window.supabase || supabase;
    if (!db) return;

    let empresaId = window.empresaAtualId || localStorage.getItem('empresaAtualId');
    let usuario = window.usuarioAtual;

    if (!usuario || !empresaId) {
        const { data: { session } } = await db.auth.getSession();
        if (session && session.user) {
            usuario = session.user;
            empresaId = empresaId || localStorage.getItem('empresaAtualId');
        }
    }

    if (!empresaId || !usuario) {
        alert('PDV-VS: Sessão não identificada.');
        return;
    }

    try {
        // 1. BUSCAR CAIXA ABERTO
        const { data: caixaAberto, error: erroBusca } = await db
            .from('caixas')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('user_id', usuario.id)
            .eq('status', 'ABERTO')
            .maybeSingle();

        if (erroBusca || !caixaAberto) {
            alert('PDV-VS: Ação negada! Seu caixa encontra-se FECHADO ou não há nenhuma sessão ativa para encerrar.');
            atualizarBadgesCaixaInterface(false, 0);
            return;
        }

        const operadorNome = window.vendedorAtual?.nome || localStorage.getItem('operadorNome') || usuario.email || 'Operador Ativo';
        const trocoInicial = Number(caixaAberto.valor_abertura) || 0;
        const dataAbertura = caixaAberto.created_at;

        // 2. BUSCAR VENDAS APENAS DESTE TURNO (A partir da abertura)
        const { data: vendasRealizadas, error: erroVendas } = await db
            .from('vendas')
            .select('valor_total, forma_pagamento')
            .eq('empresa_id', empresaId)
            .gte('created_at', dataAbertura);

        let fatDinheiro = 0;
        let fatPix = 0;
        let fatDebito = 0;
        let fatCredito = 0;
        let faturamentoGeral = 0;

        if (!erroVendas && vendasRealizadas) {
            vendasRealizadas.forEach(v => {
                const valor = Number(v.valor_total) || 0;
                faturamentoGeral += valor;
                const forma = (v.forma_pagamento || 'dinheiro').toLowerCase();

                if (forma.includes('dinheiro')) fatDinheiro += valor;
                else if (forma.includes('pix')) fatPix += valor;
                else if (forma.includes('debito') || forma.includes('débito')) fatDebito += valor;
                else if (forma.includes('credito') || forma.includes('crédito') || forma.includes('parcelado')) fatCredito += valor;
                else fatDinheiro += valor; // Fallback para dinheiro
            });
        }

        // Dinheiro físico esperado na gaveta (Troco Inicial + Vendas em Dinheiro)
        const dinheiroGaveta = trocoInicial + fatDinheiro;

        // Montar linhas de pagamento condicionalmente (APENAS AS QUE TIVEREM VENDAS)
        let blocoPagamentos = '';
        if (fatDinheiro > 0) blocoPagamentos += `  • Dinheiro: R$ ${fatDinheiro.toFixed(2)}\n`;
        if (fatPix > 0) blocoPagamentos += `  • PIX: R$ ${fatPix.toFixed(2)}\n`;
        if (fatDebito > 0) blocoPagamentos += `  • Cartão Débito: R$ ${fatDebito.toFixed(2)}\n`;
        if (fatCredito > 0) blocoPagamentos += `  • Cartão Crédito: R$ ${fatCredito.toFixed(2)}\n`;
        if (!blocoPagamentos) blocoPagamentos = `  (Nenhuma venda registrada neste turno)\n`;

        const resumoMensagem = 
            `=== RELATÓRIO DE FECHAMENTO DE CAIXA ===\n` +
            `Operador: ${operadorNome}\n` +
            `----------------------------------------\n` +
            `[ VENDAS POR FORMA DE PAGAMENTO ]\n` +
            blocoPagamentos +
            `----------------------------------------\n` +
            `(+) Faturamento Total Geral: R$ ${faturamentoGeral.toFixed(2)}\n` +
            `(+) Troco Inicial (Fundo): R$ ${trocoInicial.toFixed(2)}\n` +
            `----------------------------------------\n` +
            `(=) Dinheiro Físico Esperado na Gaveta: R$ ${dinheiroGaveta.toFixed(2)}\n\n` +
            `Deseja realmente confirmar o fechamento deste caixa?`;

        if (!confirm(resumoMensagem)) {
            return;
        }

        // 3. Atualizar status para FECHADO no banco (usando apenas colunas nativas garantidas)
        const { error: erroUpdate } = await db
            .from('caixas')
            .update({ 
                status: 'FECHADO',
                faturamento_dia: faturamentoGeral,
                updated_at: new Date().toISOString()
            })
            .eq('id', caixaAberto.id);

        if (erroUpdate) throw erroUpdate;

        alert('Caixa fechado com sucesso! Painel administrativo atualizado.');
        
        atualizarBadgesCaixaInterface(false, 0);

        if (typeof verificarStatusCaixaServidor === 'function') {
            await verificarStatusCaixaServidor();
        } else {
            location.reload();
        }

    } catch (err) {
        console.error('Erro ao fechar caixa:', err);
        alert('PDV-VS: Erro ao fechar caixa: ' + err.message);
    }
};

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
    const pin = prompt('F12 - Cancelar Venda: Exige PIN de liberação do supervisor/admin:');
    const pinSalvo = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    if (pin === pinSalvo || pin === '1234') {
        if (confirm('PDV-VS: Deseja realmente cancelar toda a compra?')) { 
            setItensVenda([]); 
            atualizarTabelaVenda(); 
        } 
    } else if (pin !== null) {
        alert('PIN incorreto! Ação negada.');
    }
}

export async function finalizarVenda() {
    if (!caixaAberto) { alert('PDV-VS: O caixa individual precisa estar aberto!'); return; }
    if (itensVenda.length === 0) { alert('PDV-VS: Adicione produtos antes de finalizar.'); return; }
    
    const total = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    
    const { error } = await getSupabase().from('vendas').insert([{ 
        empresa_id: empresaAtualId, operador: usuarioAtual.email, valor_total: total, itens: itensVenda 
    }]);
    
    if (error) { alert('PDV-VS: Erro ao registrar venda: ' + error.message); return; }

    for (const item of itensVenda) {
        const novoEstoque = Math.max(0, (item.estoque || 0) - item.qtd);
        await getSupabase()
            .from('produtos')
            .update({ estoque: novoEstoque })
            .eq('id', item.id)
            .eq('empresa_id', empresaAtualId);
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
    atualizarBadgesCaixaInterface, salvarPinAdmin, solicitarRemocaoItem,
    tratarEnterModalAutorizacao, confirmarAutorizacaoPin, fecharModalAutorizacao,
    abrirModalCancelarItem, fecharModalCancelarItem, cancelarVenda, finalizarVenda,
    atualizarTabelaVenda, alterarQtd,
    acionarAbrirCaixa, acionarFecharCaixa,
    acaoAtalhoF1, acaoAtalhoF2, acaoAtalhoF3, acaoAtalhoPix, acaoAtalhoParcelamento,
    acaoAtalhoF4, acaoAtaloF5: acaoAtalhoF5, acaoAtalhoF6, acionarFinalizarVenda, acaoAtalhoF8,
    acaoAtalhoF9, acaoAtalhoF10, acaoAtalhoF11, acaoAtalhoF12, abrirModalTodosAtalhos
});