// ==========================================
// PDV-VS Enterprise - Módulo Principal (main.js)
// Conexão e Inicialização Oficial com Supabase
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Credenciais oficiais e definitivas do seu projeto Supabase
const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';

// Inicializando o cliente Supabase globalmente na aplicação
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("🟢 [SUPABASE] Conectado com sucesso!");

window.carrinhoVenda = [];
let formaPagamentoAtual = 'dinheiro'; // 'dinheiro', 'pix', 'debito', 'credito'
let maquininhasCadastradasLoja = [];
let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarEventosPDV();
    carregarFaturamentoDiarioResumo();
    configurarEventoPWA();
    configurarBotaoInstalacaoManual();
});

// --- LÓGICA DO PWA E BOTÃO DE INSTALAÇÃO ---
function configurarEventoPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log("PWA pronto para instalação.");
        
        const btnInstalar = document.getElementById('btnInstalarPWA');
        if (btnInstalar) {
            btnInstalar.classList.remove('hidden');
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        console.log('PWA instalado com sucesso pelo usuário!');
        const btnInstalar = document.getElementById('btnInstalarPWA');
        if (btnInstalar) {
            btnInstalar.classList.add('hidden');
        }
    });
}

function configurarBotaoInstalacaoManual() {
    const btnInstalar = document.getElementById('btnInstalarPWA');
    if (btnInstalar) {
        btnInstalar.addEventListener('click', async () => {
            if (!deferredPrompt) {
                alert("O aplicativo já está instalado ou o navegador não suporta a instalação direta neste momento.");
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Utilizador aceitou instalar o PWA.');
            }
            deferredPrompt = null;
            btnInstalar.classList.add('hidden');
        });
    }
}

function inicializarEventosPDV() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            const inputBusca = document.getElementById('inputBusca');
            if (inputBusca) inputBusca.focus();
        } else if (e.key === 'F9') {
            e.preventDefault();
            finalizarVenda();
        } else if (e.key === 'Escape') {
            fecharModalFinalizarVenda();
            fecharPainelAdmin();
            fecharModalCaixa();
        }
    });
}

// --- AUTENTICAÇÃO E TELAS (SUPABASE) ---
window.tratarEnterLogin = function(e) {
    if (e.key === 'Enter') {
        window.processarAutenticacao();
    }
}

window.processarAutenticacao = async function() {
    console.log("Processando autenticação com Supabase...");
    
    const emailInput = document.getElementById('authEmail');
    const senhaInput = document.getElementById('authSenha');
    
    if (!emailInput || !senhaInput) {
        console.error("Campos de login (authEmail / authSenha) não encontrados no DOM.");
        alert("Erro interno: Campos de login não encontrados na tela.");
        return;
    }
    
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        alert("Por favor, preencha o e-mail e a senha.");
        return;
    }

    try {
        if (!window.supabaseClient) {
            throw new Error("Cliente Supabase não inicializado.");
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) throw error;

        if (data && data.user) {
            localStorage.setItem('pdv_usuario_email', data.user.email);
            localStorage.setItem('pdv_loja_id', data.user.id); 
            
            alert("Login efetuado com sucesso!");
            window.location.reload();
        }
    } catch (e) {
        console.error("Erro no login:", e);
        alert("Erro ao autenticar: " + (e.message || e));
    }
}

window.alternarTelaAuth = function() {
    console.log("Alternando tela de autenticação...");
}

window.solicitarRecuperacaoSenha = function() {
    console.log("Solicitando recuperação de senha...");
}

window.atualizarPaginaCompleta = function() {
    window.location.reload();
}

window.realizarLogout = function() {
    localStorage.removeItem('pdv_loja_id');
    localStorage.removeItem('pdv_usuario_email');
    window.location.reload();
}

// --- BUSCA E ADIÇÃO DE PRODUTOS ---
window.aoDigitarBusca = async function(termo) {
    const painel = document.getElementById('painelSugestoes');
    if (!painel) return;
    
    if (!termo || termo.trim().length < 2) {
        painel.classList.add('hidden');
        return;
    }

    const lojaId = localStorage.getItem('pdv_loja_id');
    try {
        const { data, error } = await window.supabaseClient
            .from('produtos')
            .select('*')
            .eq('loja_id', lojaId)
            .or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`)
            .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
            painel.innerHTML = '';
            data.forEach(prod => {
                const div = document.createElement('div');
                div.className = "p-2.5 hover:bg-emerald-50 cursor-pointer border-b flex justify-between items-center text-sm";
                div.innerHTML = `<div><strong>${prod.nome}</strong> <span class="text-xs text-slate-400">(${prod.codigo || 'Sem Cód'})</span></div><span class="font-bold text-emerald-600">R$ ${Number(prod.preco).toFixed(2)}</span>`;
                div.onclick = () => {
                    adicionarProdutoAoCarrinho(prod);
                    document.getElementById('inputBusca').value = '';
                    painel.classList.add('hidden');
                };
                painel.appendChild(div);
            });
            painel.classList.remove('hidden');
        } else {
            painel.classList.add('hidden');
        }
    } catch (e) {
        console.error("Erro ao buscar produto:", e);
    }
}

window.tratarEnterBuscaCaixa = async function(e) {
    if (e.key === 'Enter') {
        const termo = e.target.value.trim();
        if (!termo) return;

        const lojaId = localStorage.getItem('pdv_loja_id');
        try {
            const { data, error } = await window.supabaseClient
                .from('produtos')
                .select('*')
                .eq('loja_id', lojaId)
                .or(`codigo.eq.${termo},nome.ilike.%${termo}%`)
                .limit(1);

            if (error) throw error;
            if (data && data.length > 0) {
                adicionarProdutoAoCarrinho(data[0]);
                e.target.value = '';
                const painel = document.getElementById('painelSugestoes');
                if (painel) painel.classList.add('hidden');
            } else {
                alert("Produto não encontrado!");
            }
        } catch (err) {
            console.error(err);
        }
    }
}

window.adicionarProdutoAoCarrinho = function(produto) {
    const itemExistente = window.carrinhoVenda.find(i => i.id === produto.id);
    if (itemExistente) {
        itemExistente.quantidade += 1;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco;
    } else {
        window.carrinhoVenda.push({
            id: produto.id,
            nome: produto.nome,
            codigo: produto.codigo,
            preco: Number(produto.preco),
            quantidade: 1,
            unidade: produto.unidade || 'UN',
            subtotal: Number(produto.preco)
        });
    }
    renderizarCarrinho();
}

window.renderizarCarrinho = function() {
    const tbody = document.getElementById('tabelaItensVenda');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (window.carrinhoVenda.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto adicionado na venda.</td></tr>`;
        document.getElementById('txtSubtotal').innerText = 'R$ 0,00';
        document.getElementById('txtTotal').innerText = 'R$ 0,00';
        document.getElementById('contadorItens').innerText = '0 itens';
        return;
    }

    let totalGeral = 0;
    let totalItensCount = 0;

    window.carrinhoVenda.forEach((item, index) => {
        totalGeral += item.subtotal;
        totalItensCount += item.quantidade;

        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2 font-medium text-slate-800">${item.nome}</td>
                <td class="p-2">
                    <input type="number" step="${item.unidade === 'KG' ? '0.001' : '1'}" value="${item.quantidade}" onchange="atualizarQuantidadeItem(${index}, this.value)" class="w-20 p-1 border rounded text-xs text-center font-bold">
                </td>
                <td class="p-2 text-slate-600">R$ ${item.preco.toFixed(2)}</td>
                <td class="p-2 font-bold text-slate-900">R$ ${item.subtotal.toFixed(2)}</td>
                <td class="p-2 text-center">
                    <button onclick="removerItemCarrinho(${index})" class="text-rose-500 hover:text-rose-700 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    document.getElementById('txtSubtotal').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('txtTotal').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('contadorItens').innerText = `${totalItensCount} itens`;
}

window.atualizarQuantidadeItem = function(index, novaQtd) {
    const qtd = Number(novaQtd);
    if (qtd <= 0) {
        removerItemCarrinho(index);
        return;
    }
    window.carrinhoVenda[index].quantidade = qtd;
    window.carrinhoVenda[index].subtotal = qtd * window.carrinhoVenda[index].preco;
    renderizarCarrinho();
}

window.removerItemCarrinho = function(index) {
    window.carrinhoVenda.splice(index, 1);
    renderizarCarrinho();
}

window.cancelarVenda = function() {
    if (window.carrinhoVenda.length === 0) return;
    if (confirm("Deseja realmente cancelar toda a venda atual?")) {
        window.carrinhoVenda = [];
        renderizarCarrinho();
    }
}

window.calcularTotalCarrinho = function() {
    return window.carrinhoVenda.reduce((acc, item) => acc + item.subtotal, 0);
}

// ==========================================
// FLUXO DE FINALIZAÇÃO E PAGAMENTO COM MAQUININHAS
// ==========================================

window.finalizarVenda = async function() {
    if (window.carrinhoVenda.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }
    
    await carregarMaquininhasParaVenda();
    
    const modal = document.getElementById('modalFinalizarVenda');
    if (modal) modal.classList.remove('hidden');
    
    selecionarFormaPagamento('dinheiro');
    
    const totalGeral = calcularTotalCarrinho();
    document.getElementById('modalValTotalOriginal').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('modalValFinalComJuros').innerText = `R$ ${totalGeral.toFixed(2)}`;
}

window.fecharModalFinalizarVenda = function() {
    const modal = document.getElementById('modalFinalizarVenda');
    if (modal) modal.classList.add('hidden');
}

window.selecionarFormaPagamento = function(tipo) {
    formaPagamentoAtual = tipo;
    
    ['Dinheiro', 'Pix', 'Debito', 'Credito'].forEach(t => {
        const btn = document.getElementById(`btnForma${t}`);
        if (btn) {
            btn.className = "py-2.5 px-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition text-center";
        }
    });
    
    const mapBtn = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Debito', credito: 'Credito' };
    const btnAtivo = document.getElementById(`btnForma${mapBtn[tipo]}`);
    if (btnAtivo) {
        btnAtivo.className = "py-2.5 px-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition text-center";
    }
    
    const secaoCartao = document.getElementById('secaoOpcoesCartao');
    const secaoDinheiro = document.getElementById('secaoDinheiroTroco');
    const divParcelas = document.getElementById('divSeletorParcelas');
    
    if (tipo === 'debito' || tipo === 'credito') {
        if (secaoCartao) secaoCartao.classList.remove('hidden');
        if (secaoDinheiro) secaoDinheiro.classList.add('hidden');
        if (tipo === 'credito') {
            if (divParcelas) divParcelas.classList.remove('hidden');
        } else {
            if (divParcelas) divParcelas.classList.add('hidden');
        }
    } else {
        if (secaoCartao) secaoCartao.classList.add('hidden');
        if (tipo === 'dinheiro') {
            if (secaoDinheiro) secaoDinheiro.classList.remove('hidden');
        } else {
            if (secaoDinheiro) secaoDinheiro.classList.add('hidden');
        }
    }
    recalcularTotalComTaxasMaquininha();
}

async function carregarMaquininhasParaVenda() {
    try {
        const lojaId = localStorage.getItem('pdv_loja_id');
        const { data, error } = await window.supabaseClient
            .from('maquininhas')
            .select('*')
            .eq('loja_id', lojaId);
            
        if (error) throw error;
        maquininhasCadastradasLoja = data || [];
        
        const select = document.getElementById('selectMaquininhaVenda');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione uma maquininha cadastrada...</option>';
        
        maquininhasCadastradasLoja.forEach(m => {
            select.innerHTML += `<option value="${m.id}">${m.nome} (Déb: ${m.taxa_debito}% | Créd: ${m.taxa_credito_avista}%)</option>`;
        });
    } catch (e) {
        console.error("Erro ao carregar maquininhas:", e);
    }
}

window.recalcularTotalComTaxasMaquininha = function() {
    const totalOriginal = calcularTotalCarrinho();
    let taxaPercentual = 0;
    
    if (formaPagamentoAtual === 'dinheiro' || formaPagamentoAtual === 'pix') {
        taxaPercentual = 0;
    } 
    else if (formaPagamentoAtual === 'debito' || formaPagamentoAtual === 'credito') {
        const selectMaq = document.getElementById('selectMaquininhaVenda');
        const idMaq = selectMaq ? selectMaq.value : '';
        const maq = maquininhasCadastradasLoja.find(m => m.id == idMaq);
        
        if (maq) {
            if (formaPagamentoAtual === 'debito') {
                taxaPercentual = Number(maq.taxa_debito) || 0;
            } else if (formaPagamentoAtual === 'credito') {
                const selectParcelas = document.getElementById('selectParcelasVenda');
                const parcelas = selectParcelas ? selectParcelas.value : '1';
                if (parcelas == '1') taxaPercentual = Number(maq.taxa_credito_avista) || 0;
                else if (parcelas == '2') taxaPercentual = Number(maq.taxa_2x) || 0;
                else if (parcelas == '3') taxaPercentual = Number(maq.taxa_3x) || 0;
                else if (parcelas == '6') taxaPercentual = Number(maq.taxa_6x) || 0;
                else if (parcelas == '12') taxaPercentual = Number(maq.taxa_12x) || 0;
            }
        }
    }
    
    const valorTaxa = (totalOriginal * taxaPercentual) / 100;
    const totalComJuros = totalOriginal + valorTaxa;
    
    const elTaxa = document.getElementById('txtTaxaAplicadaInfo');
    const elFinal = document.getElementById('modalValFinalComJuros');
    
    if (elTaxa) elTaxa.innerText = `${taxaPercentual.toFixed(2)}% (R$ ${valorTaxa.toFixed(2)})`;
    if (elFinal) elFinal.innerText = `R$ ${totalComJuros.toFixed(2)}`;
}

window.calcularTrocoCaixa = function() {
    const totalOriginal = calcularTotalCarrinho();
    const inputRecebido = document.getElementById('inputValorRecebido');
    const recebido = inputRecebido ? Number(inputRecebido.value) || 0 : 0;
    const troco = recebido - totalOriginal;
    
    const txtTroco = document.getElementById('txtTrocoDevolver');
    if (txtTroco) {
        txtTroco.innerText = troco >= 0 ? `R$ ${troco.toFixed(2)}` : `R$ 0,00`;
    }
}

window.confirmarConclusaoVenda = async function() {
    const totalOriginal = calcularTotalCarrinho();
    const txtFinal = document.getElementById('modalValFinalComJuros').innerText;
    const valorFinal = Number(txtFinal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    
    const lojaId = localStorage.getItem('pdv_loja_id');
    const operadorEmail = localStorage.getItem('pdv_usuario_email') || 'caixa';

    try {
        const { error } = await window.supabaseClient
            .from('vendas')
            .insert([{
                loja_id: lojaId,
                operador: operadorEmail,
                forma_pagamento: formaPagamentoAtual,
                valor_original: totalOriginal,
                valor_total: valorFinal, // Corrigido para valor_total de acordo com o banco
                itens: window.carrinhoVenda,
                data_venda: new Date().toISOString()
            }]);

        if (error) throw error;

        alert(`Venda finalizada com sucesso via ${formaPagamentoAtual.toUpperCase()}! Valor: R$ ${valorFinal.toFixed(2)}`);
        
        window.carrinhoVenda = [];
        renderizarCarrinho();
        fecharModalFinalizarVenda();
        carregarFaturamentoDiarioResumo();
    } catch (e) {
        console.error("Erro ao concluir venda:", e);
        alert("Erro ao registrar a venda no banco de dados.");
    }
}

async function carregarFaturamentoDiarioResumo() {
    try {
        const lojaId = localStorage.getItem('pdv_loja_id');
        if (!lojaId) return;

        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);

        const { data, error } = await window.supabaseClient
            .from('vendas')
            .select('valor_total') // Corrigido para valor_total de acordo com o banco
            .eq('loja_id', lojaId)
            .gte('data_venda', hojeInicio.toISOString());

        if (error) throw error;

        let totalDia = 0;
        if (data) {
            data.forEach(v => totalDia += Number(v.valor_total) || 0); // Corrigido para valor_total
        }

        const el = document.getElementById('txtFaturamentoDia');
        if (el) el.innerText = `R$ ${totalDia.toFixed(2)}`;
    } catch (e) {
        console.error("Erro ao carregar faturamento diário:", e);
    }
}

// --- FUNÇÕES DE APOIO E PAINEL ADMIN / MODAIS ---
window.abrirLeitorCamera = function() { console.log("Abrindo leitor de câmera..."); }
window.abrirModalCancelarItem = function() { console.log("Abrindo modal cancelar item..."); }
window.gerenciarCaixaModal = function() { console.log("Gerenciando caixa..."); }
window.abrirPainelAdmin = function() { 
    const painel = document.getElementById('painelAdmin');
    if (painel) painel.classList.remove('hidden');
}
window.mudarAbaAdmin = function(aba) { console.log("Mudando para aba:", aba); }
window.filtrarTabelaAdmin = function() {}
window.abrirModalNovoProdutoAdmin = function() {}
window.recarregarDadosAdmin = function() {}
window.fecharPainelAdmin = function() { 
    const painel = document.getElementById('painelAdmin');
    if (painel) painel.classList.add('hidden');
}
window.abrirModalNovoOperador = function() {}
window.abrirModalNovaMaquininha = function() {}
window.salvarConfiguracoesEmpresaAdmin = function() {}
window.salvarPinAdmin = function() {}
window.fecharFormProduto = function() {}
window.salvarProdutoAdmin = function() {}
window.escanearCameraAdmin = function() {}
window.fecharModalNovaMaquininha = function() {}
window.salvarNovaMaquininha = function() {}
window.tratarEnterModalCaixa = function() {}
window.fecharModalCaixa = function() {
    const modal = document.getElementById('modalCaixa');
    if (modal) modal.classList.add('hidden');
}
window.confirmarAcaoCaixa = function() {}