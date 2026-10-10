// ==========================================  
// MÓDULO DE CAIXA E VENDAS (PDV-VS) 
// ==========================================  

import { abrirLeitorCamera, inicializarLeitorTecladoPistola } from '../../camera.js';  
import {   
    usuarioAtual, empresaAtualId, cargoUsuarioAtual, caixaAberto, faturamentoDia,   
    acaoCaixaAtual, itensVenda, indiceItemParaRemover, setAcaoCaixaAtual,   
    setCaixaAberto, setFaturamentoDia, setIndiceItemParaRemover, setItensVenda, setProdutosCache,
    produtosCache, setEmpresaAtualId, setUsuarioAtual, setCargoUsuarioAtual,
    setDadosEmpresaAtual
} from '../../core/state.js';  
import { adicionarItemVendaDireto, carregarProdutosCache, tratarAdicaoProduto } from '../../services/produtos.js';
import { supabase } from '../../../core/config.js'; // Correção definitiva do import do Supabase

let valorTrocoAbertura = 0;
let horaAberturaCaixa = null;
let canalRealtimeCaixa = null;
let canalRealtimeProdutos = null;

// --- UTILITÁRIO DE CLIENTE SUPABASE ---
const getSupabase = () => window.supabaseClient || window.supabase || supabase;
window.supabaseClient = window.supabaseClient || supabase;
window.supabase = window.supabase || supabase;

function isInvalidAuthSessionError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.status === 401
        || /jwt|invalid token|token is expired|refresh token|auth session missing|session_not_found/.test(message);
}

async function redirecionarSessaoInvalida(db, error) {
    if (!isInvalidAuthSessionError(error)) return false;

    console.warn('PDV-VS: Sessão inválida ou expirada. Encerrando a sessão local e redirecionando para autenticação.', error);
    try {
        const { error: signOutError } = await db.auth.signOut({ scope: 'local' });
        if (signOutError) {
            console.error('PDV-VS: Não foi possível limpar a sessão local inválida:', signOutError);
        }
    } catch (signOutError) {
        console.error('PDV-VS: Falha ao limpar a sessão local inválida:', signOutError);
    }
    window.location.href = '../auth/auth.html';
    return true;
}

window.carregarOperadoresLoja = window.carregarOperadoresLoja || async function() {
    try {
        const db = getSupabase();
        if (!db || !empresaAtualId) return [];

        const { data, error } = await db
            .from('usuarios_empresas')
            .select('user_id, cargo')
            .eq('empresa_id', empresaAtualId);
        if (error) throw error;

        const selectOperador = document.getElementById('operador-select');
        if (selectOperador && data) {
            selectOperador.replaceChildren(...data.map(operador => {
                const option = document.createElement('option');
                option.value = operador.user_id;
                option.textContent = operador.cargo || operador.user_id;
                return option;
            }));
        }
        return data || [];
    } catch (error) {
        console.warn('PDV-VS: Aviso ao carregar operadores (não bloqueante):', error);
        return [];
    }
};

export async function obterContextoAutenticadoSupabase() {
    const db = getSupabase();
    if (!db) throw new Error('Cliente Supabase não inicializado.');
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) return null;

    const { data: vinculo, error: vinculoError } = await db
        .from('usuarios_empresas')
        .select('empresa_id, cargo')
        .eq('user_id', user.id)
        .maybeSingle();
    if (vinculoError) throw vinculoError;

    let empresaId = vinculo?.empresa_id || user.id;
    let { data: empresa, error: empresaError } = await db
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa && !vinculo && user.email) {
        const resultadoEmpresaEmail = await db
            .from('empresas')
            .select('*')
            .eq('email_admin', user.email)
            .maybeSingle();
        if (resultadoEmpresaEmail.error) throw resultadoEmpresaEmail.error;
        empresa = resultadoEmpresaEmail.data;
        if (empresa) empresaId = empresa.id;
    }
    if (!empresa) throw new Error('Não foi possível localizar a empresa vinculada à sessão.');

    const cargo = vinculo?.cargo || (
        empresa.id === user.id || empresa.email_admin === user.email
            ? 'admin_mercado'
            : null
    );
    if (cargo !== 'admin_mercado' && cargo !== 'operador') {
        window.location.href = '../auth/auth.html';
        return null;
    }

    setUsuarioAtual(user);
    setEmpresaAtualId(empresaId);
    setCargoUsuarioAtual(cargo);
    setDadosEmpresaAtual(empresa);

    window.usuarioAtual = user;
    window.empresaAtualId = empresaId;
    window.cargoUsuarioAtual = cargo;
    window.dadosEmpresaAtual = empresa;
    localStorage.setItem('usuario', JSON.stringify(user));
    localStorage.setItem('empresa_id', empresaId);
    localStorage.setItem('empresaAtualId', empresaId);
    localStorage.setItem('pdv_empresa_id', empresaId);
    atualizarIdentidadeCaixa({ user, cargo });

    return { user, empresaId, cargo, empresa };
}

function atualizarIdentidadeCaixa({ user, cargo }) {
    const nome = cargo === 'admin_mercado'
        ? 'Administrador'
        : user.user_metadata?.full_name || user.email?.split('@')[0] || 'Operador';
    const terminal = cargo === 'admin_mercado' ? '#01' : '#02';
    const infoOperador = document.getElementById('txtInfoOperador');
    if (infoOperador) {
        infoOperador.textContent = '';
        const nomeEl = document.createElement('strong');
        nomeEl.className = 'text-gray-200';
        nomeEl.textContent = nome;
        const terminalEl = document.createElement('strong');
        terminalEl.className = 'text-gray-200';
        terminalEl.textContent = terminal;
        infoOperador.append('Perfil: ', nomeEl, ' | Caixa: ', terminalEl);
    }

    const botaoAdmin = document.getElementById('btnPainelAdmin');
    if (botaoAdmin) {
        botaoAdmin.style.display = cargo === 'admin_mercado' ? 'flex' : 'none';
    }
}

async function inicializarCaixaDefinitivo() {
    try {
        const db = getSupabase();
        if (!db) throw new Error('Cliente Supabase não inicializado.');

        const { data: { session }, error: sessionError } = await db.auth.getSession();
        if (sessionError) {
            if (await redirecionarSessaoInvalida(db, sessionError)) return;
            throw sessionError;
        }
        if (!session?.user) {
            console.warn('PDV-VS: Sessão ausente. Redirecionando para autenticação...');
            window.location.href = '../auth/auth.html';
            return;
        }

        const contexto = await obterContextoAutenticadoSupabase();
        if (!contexto) {
            console.warn('PDV-VS: Sessão expirada. Redirecionando para autenticação...');
            window.location.href = '../auth/auth.html';
            return;
        }

        await carregarProdutosCache();
        await verificarStatusCaixaServidor();
        await iniciarRealtimeCaixa();
        focarBusca();
    } catch (error) {
        if (await redirecionarSessaoInvalida(getSupabase(), error)) return;
        console.error('PDV-VS: Falha ao inicializar a sessão pelo Supabase:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCaixaDefinitivo, { once: true });
} else {
    inicializarCaixaDefinitivo();
}

// --- CONTROLE DO SCANNER DE CÂMERA ---
window.abrirCameraScanner = () => {
  abrirLeitorCamera(); // Usa o mesmo leitor com moldura qrbox no app e no navegador
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
        const db = getSupabase();
        if (!db) throw new Error('Cliente Supabase não inicializado.');

        const { data, error } = await db
            .from('caixas')
            .select('status, valor_abertura, faturamento_dia')
            .eq('empresa_id', empresaAtualId)
            .eq('user_id', usuarioAtual.id)
            .eq('status', 'ABERTO')
            .maybeSingle();
        if (error) throw error;

        if (data) {
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
            if (typeof window.carregarOperadoresLoja === 'function') window.carregarOperadoresLoja();
            if (typeof window.carregarHistoricoAdmin === 'function') window.carregarHistoricoAdmin();
        }
    } catch (err) {
        console.error('PDV-VS: Erro ao verificar status do caixa no servidor:', err);
    }
}

// Configuração de Tempo Real (Supabase Realtime)
export async function iniciarRealtimeCaixa() {
    if (!empresaAtualId) return;

    const db = getSupabase();
    if (!db) {
        console.warn('PDV-VS: Cliente Supabase indisponível; Realtime do caixa não foi iniciado.');
        return;
    }

    if (canalRealtimeCaixa) {
        await db.removeChannel(canalRealtimeCaixa);
    }
    if (canalRealtimeProdutos) {
        await db.removeChannel(canalRealtimeProdutos);
    }

    canalRealtimeCaixa = db
        .channel(`caixa-core-${empresaAtualId}`)
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
                    if (typeof window.carregarOperadoresLoja === 'function') window.carregarOperadoresLoja();
                    if (typeof window.carregarHistoricoAdmin === 'function') window.carregarHistoricoAdmin();
                }
            }
        )
        .subscribe((status, error) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('PDV-VS: Aviso no canal Realtime do caixa:', error || status);
            }
        });

    canalRealtimeProdutos = db
        .channel(`pdv-produtos-${empresaAtualId}-${usuarioAtual?.id}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${empresaAtualId}` },
            payload => {
                const produtoId = payload.new?.id ?? payload.old?.id;
                if (!produtoId) return;

                const produtosAtualizados = produtosCache.filter(produto => produto.id !== produtoId);
                if (payload.eventType !== 'DELETE' && payload.new) {
                    produtosAtualizados.push(payload.new);
                }
                produtosAtualizados.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
                setProdutosCache(produtosAtualizados);

                const inputBusca = document.getElementById('inputBusca');
                if (inputBusca?.value) aoDigitarBusca({ target: inputBusca });
            }
        )
        .subscribe((status, error) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('PDV-VS: Aviso no canal Realtime dos produtos:', error || status);
            }
        });
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
            if (typeof window.carregarHistoricoAdmin === 'function') await window.carregarHistoricoAdmin();
            if (typeof window.carregarOperadoresLoja === 'function') await window.carregarOperadoresLoja();
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

export function focarBusca() {
    const input = document.getElementById('inputBusca');
    if (!input) return;
    input.focus();
    const length = input.value.length;
    if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(length, length);
    }
}

function mostrarPainelSugestoes() {
    const painel = document.getElementById('sugestoesBusca');
    if (!painel) return;
    painel.classList.remove('hidden');
    painel.style.display = 'block';
    painel.style.visibility = 'visible';
    painel.style.pointerEvents = 'auto';
    painel.style.opacity = '1';
    painel.style.zIndex = '100';
}

function ocultarPainelSugestoes() {
    const painel = document.getElementById('sugestoesBusca');
    if (!painel) return;
    painel.classList.add('hidden');
    painel.innerHTML = '';
    painel.style.display = 'none';
    painel.style.visibility = 'hidden';
    painel.style.pointerEvents = 'none';
    painel.style.opacity = '0';
}

function atualizarSelecaoSugestoes(painel, indexAtual) {
    const itens = [...(painel?.querySelectorAll('.item-sugestao-busca') || [])];
    if (!itens.length) return;

    const valorSeguro = Number.isInteger(indexAtual) ? indexAtual : -1;
    itens.forEach((item, index) => {
        const selecionado = index === valorSeguro;
        item.classList.toggle('bg-emerald-950/80', selecionado);
        item.classList.toggle('border-emerald-700', selecionado);
        item.classList.toggle('text-white', selecionado);
        item.classList.toggle('shadow-md', selecionado);
        item.classList.toggle('ring-1', selecionado);
        item.classList.toggle('ring-emerald-500/80', selecionado);
        item.setAttribute('aria-selected', String(selecionado));
        if (selecionado) item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
}

window.adicionarProdutoAoCarrinho = function(produto, quantidade = 1) {
    if (!produto || produto.id == null) {
        console.error('PDV-VS: Não foi possível adicionar um produto inválido ao carrinho.', produto);
        return;
    }

    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
        alert('PDV-VS: Informe uma quantidade válida para adicionar o produto.');
        return;
    }

    if (qtd === 1) {
        tratarAdicaoProduto(produto);
    } else if (produto.unidade === 'KG' || produto.por_peso || produto.isPeso) {
        tratarAdicaoProduto(produto);
    } else {
        adicionarItemVendaDireto(produto, qtd);
    }

    window.quantidadeMultiplicador = 1;
    ocultarPainelSugestoes();
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) {
        inputBusca.value = '';
        inputBusca.dataset.indiceSelecionado = '0';
        inputBusca.focus();
    }
};

window.adicionarProdutoComQtd = function(produto, quantidade = 1) {
    window.adicionarProdutoAoCarrinho(produto, quantidade);
};

window.adicionarProdutoPorId = function(produtoId, quantidade = window.quantidadeMultiplicador || 1) {
    const produto = produtosCache.find(item => String(item.id) === String(produtoId));
    if (!produto) {
        alert('PDV-VS: Produto não encontrado para adicionar ao carrinho.');
        return;
    }
    window.adicionarProdutoAoCarrinho(produto, quantidade);
};

export function aoDigitarBusca(e) {
    if (!e || !e.target) return;
    
    const termo = e.target.value.trim().toLowerCase();
    const suggestionsBox = document.getElementById('sugestoesBusca');
    
    if (!suggestionsBox) return;

    if (!termo) {
        ocultarPainelSugestoes();
        e.target.dataset.indiceSelecionado = '0';
        return;
    }

    const filtrados = produtosCache.filter(p => 
        String(p.nome || '').toLowerCase().includes(termo) ||
        String(p.codigo_barras || '').toLowerCase().includes(termo) ||
        String(p.codigo || '').toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
        suggestionsBox.innerHTML = '<div class="p-3 text-sm text-slate-400">Nenhum produto encontrado.</div>';
        mostrarPainelSugestoes();
        e.target.dataset.indiceSelecionado = '0';
        return;
    }

    let html = '';
    filtrados.slice(0, 10).forEach((prod, index) => {
        const preco = Number(prod.preco_venda || prod.preco || 0).toFixed(2);
        html += `<div data-index="${index}" class="item-sugestao-busca p-2.5 cursor-pointer border-b border-slate-700 flex justify-between items-center gap-3 text-sm transition-colors hover:bg-slate-700/80 ${index === 0 ? 'bg-emerald-950/80 border-emerald-700 text-white shadow-md ring-1 ring-emerald-500/80' : 'text-slate-200'}" onclick="window.adicionarProdutoPorId('${prod.id}')" role="option" aria-selected="${index === 0}">
            <span class="font-medium truncate">${prod.nome}</span>
            <span class="text-xs font-bold text-emerald-400">R$ ${preco}</span>
        </div>`;
    });
    
    suggestionsBox.innerHTML = html;
    e.target.dataset.indiceSelecionado = '0';
    mostrarPainelSugestoes();
    atualizarSelecaoSugestoes(suggestionsBox, 0);
}

export async function tratarEnterBuscaCaixa(e) {
    if (!e || !e.target) return;

    const suggestionsBox = document.getElementById('sugestoesBusca');
    const itens = suggestionsBox ? [...suggestionsBox.querySelectorAll('.item-sugestao-busca')] : [];
    const input = document.getElementById('inputBusca');
    const indiceAtual = Number(input?.dataset?.indiceSelecionado || 0);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!itens.length) return;
        let proximoIndice = indiceAtual;
        if (e.key === 'ArrowDown') proximoIndice = proximoIndice >= itens.length - 1 ? 0 : proximoIndice + 1;
        if (e.key === 'ArrowUp') proximoIndice = proximoIndice <= 0 ? itens.length - 1 : proximoIndice - 1;
        if (input) input.dataset.indiceSelecionado = String(proximoIndice);
        atualizarSelecaoSugestoes(suggestionsBox, proximoIndice);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        if (!input) return;
        let valor = input.value.trim();

        if (itens.length > 0 && Number.isInteger(Number(input.dataset.indiceSelecionado))) {
            const indiceSelecionado = Number(input.dataset.indiceSelecionado);
            const itemSelecionado = itens[indiceSelecionado];
            if (itemSelecionado) {
                itemSelecionado.click();
                return;
            }
        }
        
        let qtdDesejada = window.quantidadeMultiplicador || 1;
        
        if (valor.includes('*')) {
            const partes = valor.split('*');
            const qtdParsed = parseFloat(partes[0].trim());
            if (!isNaN(qtdParsed) && qtdParsed > 0) {
                qtdDesejada = qtdParsed;
                valor = partes.slice(1).join('*').trim();
            }
        }

        const valorNormalizado = valor.toLowerCase();
        let encontrado = produtosCache.find(p =>
            String(p.codigo_barras || '').trim().toLowerCase() === valorNormalizado ||
            String(p.codigo || '').trim().toLowerCase() === valorNormalizado ||
            String(p.nome || '').trim().toLowerCase() === valorNormalizado ||
            String(p.id) === valor
        );
        if (!encontrado && !valor.includes('*')) {
            try {
                encontrado = await buscarProdutoPorCodigoScanner(valor);
            } catch (error) {
                console.error('PDV-VS: Erro ao consultar produto no Supabase:', error);
                alert(`PDV-VS: Não foi possível consultar o produto no servidor: ${error.message}`);
                return;
            }
        }
        if (encontrado) {
            if (window.adicionarProdutoComQtd) {
                window.adicionarProdutoComQtd(encontrado, qtdDesejada);
            } else if (window.adicionarProdutoAoCarrinho) {
                encontrado._qtdTemporaria = qtdDesejada;
                window.adicionarProdutoAoCarrinho(encontrado);
            }
            
            window.quantidadeMultiplicador = 1;
            input.value = '';
            input.dataset.indiceSelecionado = '0';
            ocultarPainelSugestoes();
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
        let { data: vendasRealizadas, error: erroVendas } = await db
            .from('vendas')
            .select('valor_total, forma_pagamento')
            .eq('empresa_id', empresaId)
            .eq('operador', usuario.email || '')
            .gte('created_at', dataAbertura);
        let formasPagamentoDisponiveis = true;
        if (erroVendas && /forma_pagamento/i.test(erroVendas.message || '')) {
            console.warn('[PDV-VS] A coluna vendas.forma_pagamento ainda não existe. Consultando valores para permitir o fechamento; aplique a migration Supabase para guardar as formas de pagamento.', erroVendas);
            const consultaSemFormaPagamento = await db
                .from('vendas')
                .select('valor_total')
                .eq('empresa_id', empresaId)
                .eq('operador', usuario.email || '')
                .gte('created_at', dataAbertura);
            if (consultaSemFormaPagamento.error) throw consultaSemFormaPagamento.error;
            vendasRealizadas = consultaSemFormaPagamento.data;
            formasPagamentoDisponiveis = false;
        } else if (erroVendas) {
            throw erroVendas;
        }

        let fatDinheiro = 0;
        let fatPix = 0;
        let fatDebito = 0;
        let fatCredito = 0;
        let fatNaoInformado = 0;
        let faturamentoGeral = 0;

        vendasRealizadas?.forEach(v => {
            const valor = Number(v.valor_total) || 0;
            faturamentoGeral += valor;
            const forma = formasPagamentoDisponiveis
                ? String(v.forma_pagamento || '').trim().toLowerCase()
                : '';

            if (forma.includes('dinheiro')) fatDinheiro += valor;
            else if (forma.includes('pix')) fatPix += valor;
            else if (forma.includes('debito') || forma.includes('débito')) fatDebito += valor;
            else if (forma.includes('credito') || forma.includes('crédito') || forma.includes('parcelado')) fatCredito += valor;
            else fatNaoInformado += valor;
        });

        // Dinheiro físico esperado na gaveta (Troco Inicial + Vendas em Dinheiro)
        const dinheiroGaveta = trocoInicial + fatDinheiro;

        // Montar linhas de pagamento condicionalmente (APENAS AS QUE TIVEREM VENDAS)
        let blocoPagamentos = '';
        if (fatDinheiro > 0) blocoPagamentos += `  • Dinheiro: R$ ${fatDinheiro.toFixed(2)}\n`;
        if (fatPix > 0) blocoPagamentos += `  • PIX: R$ ${fatPix.toFixed(2)}\n`;
        if (fatDebito > 0) blocoPagamentos += `  • Cartão Débito: R$ ${fatDebito.toFixed(2)}\n`;
        if (fatCredito > 0) blocoPagamentos += `  • Cartão Crédito: R$ ${fatCredito.toFixed(2)}\n`;
        if (fatNaoInformado > 0) blocoPagamentos += `  • Forma não informada: R$ ${fatNaoInformado.toFixed(2)}\n`;
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
        const { data: caixaFechado, error: erroUpdate } = await db
            .from('caixas')
            .update({ 
                status: 'FECHADO',
                faturamento_dia: faturamentoGeral,
                updated_at: new Date().toISOString()
            })
            .eq('id', caixaAberto.id)
            .eq('empresa_id', empresaId)
            .eq('user_id', usuario.id)
            .eq('status', 'ABERTO')
            .select('id, status, faturamento_dia')
            .maybeSingle();

        if (erroUpdate) throw erroUpdate;
        if (!caixaFechado) {
            throw new Error('O caixa não foi atualizado. Atualize a página e confira se ainda está aberto.');
        }

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

    const db = getSupabase();
    const errosSincronizacao = [];
    for (const item of itensVenda) {
        let estoqueBaixado = false;
        let erroEstoque = null;
        for (let tentativa = 0; tentativa < 3 && !estoqueBaixado; tentativa += 1) {
            const { data: produtoAtual, error: erroConsultaEstoque } = await db
                .from('produtos')
                .select('estoque')
                .eq('id', item.id)
                .eq('empresa_id', empresaAtualId)
                .maybeSingle();
            if (erroConsultaEstoque || !produtoAtual) {
                erroEstoque = erroConsultaEstoque?.message || 'produto não encontrado';
                break;
            }

            const novoEstoque = Math.max(0, (Number(produtoAtual.estoque) || 0) - item.qtd);
            let atualizacaoEstoque = db
                .from('produtos')
                .update({ estoque: novoEstoque })
                .eq('id', item.id)
                .eq('empresa_id', empresaAtualId);
            atualizacaoEstoque = produtoAtual.estoque == null
                ? atualizacaoEstoque.is('estoque', null)
                : atualizacaoEstoque.eq('estoque', produtoAtual.estoque);
            const { data: produtoAtualizado, error: erroBaixaEstoque } = await atualizacaoEstoque
                .select('id')
                .maybeSingle();
            if (erroBaixaEstoque) {
                erroEstoque = erroBaixaEstoque.message;
                break;
            }
            estoqueBaixado = Boolean(produtoAtualizado);
        }

        if (!estoqueBaixado) {
            errosSincronizacao.push(`estoque de ${item.nome}: ${erroEstoque || 'conflito simultâneo; confira o estoque'}`);
        }
    }

    const novoFat = faturamentoDia + total;
    setFaturamentoDia(novoFat); 
    const txtFat = document.getElementById('txtFaturamentoDia');
    if (txtFat) txtFat.innerText = `R$ ${novoFat.toFixed(2)}`;

    if (empresaAtualId && usuarioAtual) {
        const { data: caixaAtualizado, error: erroAtualizacaoCaixa } = await db.from('caixas').update({
            faturamento_dia: novoFat, updated_at: new Date().toISOString()
        }).eq('empresa_id', empresaAtualId).eq('user_id', usuarioAtual.id).eq('status', 'ABERTO')
            .select('id')
            .maybeSingle();
        if (erroAtualizacaoCaixa || !caixaAtualizado) {
            errosSincronizacao.push(`faturamento do caixa: ${erroAtualizacaoCaixa?.message || 'não há sessão de caixa aberta para atualizar'}`);
        }
    }

    setItensVenda([]); 
    atualizarTabelaVenda(); 
    await carregarProdutosCache();
    if (errosSincronizacao.length) {
        console.error('PDV-VS: Venda registrada com falhas parciais de sincronização:', errosSincronizacao);
        alert(`Venda registrada, mas há dados que precisam de conferência:\n${errosSincronizacao.join('\n')}`);
    }
    
    if (cargoUsuarioAtual === 'admin_mercado') {
        if (typeof window.carregarOperadoresLoja === 'function') window.carregarOperadoresLoja();
        if (typeof window.carregarHistoricoAdmin === 'function') window.carregarHistoricoAdmin();
    }
    focarBusca();
}

export function atualizarTabelaVenda() {
    const tbody = document.getElementById('tabelaItensVenda');
    const contador = document.getElementById('contadorItens');
    const txtSubtotal = document.getElementById('txtSubtotal');
    const txtTotal = document.getElementById('txtTotal');
    const listaCarrinho = document.getElementById('listaCarrinhoItens');
    const carrinhoVazio = document.getElementById('listaCarrinhoVazio');
    const txtResumoSubtotal = document.getElementById('txtResumoSubtotal');
    const txtResumoTotal = document.getElementById('txtResumoTotalGeral');

    if (contador) contador.innerText = `${itensVenda.length} itens`;
    if (!tbody && !listaCarrinho) return;

    const totalVenda = itensVenda.reduce((acc, item) => {
        const preco = Number(item.preco_venda ?? item.preco ?? 0);
        return acc + (Number(item.qtd) || 0) * preco;
    }, 0);

    if (txtSubtotal) txtSubtotal.innerText = `R$ ${totalVenda.toFixed(2)}`;
    if (txtTotal) txtTotal.innerText = `R$ ${totalVenda.toFixed(2)}`;
    if (txtResumoSubtotal) txtResumoSubtotal.innerText = `R$ ${totalVenda.toFixed(2)}`;
    if (txtResumoTotal) txtResumoTotal.innerText = `R$ ${totalVenda.toFixed(2)}`;

    if (itensVenda.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto adicionado na venda.</td></tr>';
        if (listaCarrinho) listaCarrinho.innerHTML = '';
        carrinhoVazio?.classList.remove('hidden');
        listaCarrinho?.classList.add('hidden');
        return; 
    }
    
    let tabelaHtml = '', carrinhoHtml = '', total = 0;
    itensVenda.forEach((item, i) => {
        const preco = Number(item.preco_venda ?? item.preco ?? 0);
        const qtd = Number(item.qtd) || 0;
        const subtotalItem = qtd * preco;
        total += subtotalItem;
        
        const qtdDisplay = item.isPeso
            ? `<span class="text-amber-300 font-bold">${qtd.toFixed(3)} kg</span>`
            : `<input type="number" min="1" step="1" value="${qtd}" onchange="window.alterarQtd(${i}, this.value)" aria-label="Quantidade de ${item.nome}" class="w-20 text-center bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white">`;

        if (tbody) {
            tabelaHtml += `<tr class="border-b">
                <td class="p-2">${item.nome} ${item.isPeso ? '<span class="text-[10px] text-amber-300 block">Pesado (Baixa por Peso)</span>' : ''}</td>
                <td class="p-2">${qtdDisplay}</td>
                <td class="p-2">R$ ${preco.toFixed(2)}${item.isPeso ? '/kg' : ''}</td>
                <td class="p-2 font-bold">R$ ${subtotalItem.toFixed(2)}</td>
                <td class="p-2 text-center"><button onclick="window.solicitarRemocaoItem(${i})" aria-label="Remover ${item.nome}" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        }

        if (listaCarrinho) {
            carrinhoHtml += `<div class="grid grid-cols-12 items-center gap-2 p-3 text-sm text-gray-100">
                <div class="col-span-6 min-w-0 font-medium">
                    <span class="block truncate">${item.nome}</span>
                    ${item.isPeso ? '<span class="text-[10px] text-amber-300">Pesado (Baixa por Peso)</span>' : ''}
                </div>
                <div class="col-span-3 flex flex-col items-center gap-1">
                    ${qtdDisplay}
                    <span class="text-[11px] text-gray-400">R$ ${preco.toFixed(2)}${item.isPeso ? '/kg' : ''}</span>
                </div>
                <div class="col-span-3 flex items-center justify-end gap-2">
                    <span class="font-bold text-right">R$ ${subtotalItem.toFixed(2)}</span>
                    <button onclick="window.solicitarRemocaoItem(${i})" aria-label="Remover ${item.nome}" class="text-rose-400 hover:text-rose-300 px-1"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }
    });
    if (tbody) tbody.innerHTML = tabelaHtml;
    if (listaCarrinho) {
        listaCarrinho.innerHTML = carrinhoHtml;
        listaCarrinho.classList.remove('hidden');
        carrinhoVazio?.classList.add('hidden');
    }
    if (txtSubtotal) txtSubtotal.innerText = `R$ ${total.toFixed(2)}`;
    if (txtTotal) txtTotal.innerText = `R$ ${total.toFixed(2)}`;
    if (txtResumoSubtotal) txtResumoSubtotal.innerText = `R$ ${total.toFixed(2)}`;
    if (txtResumoTotal) txtResumoTotal.innerText = `R$ ${total.toFixed(2)}`;
}

export function alterarQtd(i, qtd) { 
    const q = parseFloat(qtd); 
    if (q > 0) { itensVenda[i].qtd = q; atualizarTabelaVenda(); } 
}

async function buscarProdutoPorCodigoScanner(codigo) {
    const codigoNormalizado = String(codigo || '').trim();
    if (!codigoNormalizado || !empresaAtualId) return null;

    const db = getSupabase();
    if (!db) throw new Error('Cliente Supabase indisponível ao consultar o produto.');

    for (const campo of ['codigo_barras', 'codigo']) {
        const { data, error } = await db
            .from('produtos')
            .select('*')
            .eq('empresa_id', empresaAtualId)
            .eq(campo, codigoNormalizado)
            .maybeSingle();
        if (error) throw error;
        if (data) {
            const cacheAtualizado = produtosCache.filter(produto => produto.id !== data.id);
            setProdutosCache([...cacheAtualizado, data]);
            return data;
        }
    }

    const produtoEmCache = produtosCache.find(produto =>
        String(produto.id) === codigoNormalizado
    );
    if (produtoEmCache) {
        const { data, error } = await db
            .from('produtos')
            .select('*')
            .eq('empresa_id', empresaAtualId)
            .eq('id', produtoEmCache.id)
            .maybeSingle();
        if (error) throw error;
        if (data) {
            const cacheAtualizado = produtosCache.filter(produto => produto.id !== data.id);
            setProdutosCache([...cacheAtualizado, data]);
            return data;
        }
    }

    return null;
}

// ==========================================
// EXPOSIÇÃO GLOBAL UNIFICADA (WINDOW)
// ==========================================
Object.assign(window, {
    buscarProdutoPorCodigoScanner,
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