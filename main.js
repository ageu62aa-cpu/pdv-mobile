// ==========================================
// PDV-VS Enterprise - Módulo Principal (main.js)
// Versão Atualizada: Controle Real de Caixa, Operadores e Admin
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("🟢 [SUPABASE] Conectado com sucesso!");

window.carrinhoVenda = [];
let formaPagamentoAtual = 'dinheiro';
let maquininhasCadastradasLoja = [];
let produtosLojaCache = [];
let caixaAbertoLoja = false;

document.addEventListener("DOMContentLoaded", () => {
    verificarSessaoEAlternarTelas();
    inicializarEventosPDV();
    carregarFaturamentoDiarioResumo();
});

// --- CONTROLE DE SESSÃO, TELAS E PERMISSÕES ---
function verificarSessaoEAlternarTelas() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    const usuarioEmail = localStorage.getItem('pdv_usuario_email');
    
    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    const infoUsuario = document.getElementById('infoUsuarioLogado');

    if (lojaId && usuarioEmail) {
        if (telaLogin) telaLogin.classList.add('hidden');
        if (appPrincipal) appPrincipal.classList.remove('hidden');
        if (infoUsuario) infoUsuario.innerText = usuarioEmail;
        
        // Identifica se é o Admin Principal ou um Operador comum
        const eAdminPrincipal = localStorage.getItem('pdv_is_admin') === 'true' || 
                                 usuarioEmail.includes('vancelysoftware@gmail.com') || 
                                 !localStorage.getItem('pdv_cargo_operador');

        const btnAdmin = document.getElementById('btnAdminMenu');
        if (btnAdmin) {
            if (eAdminPrincipal) {
                btnAdmin.classList.remove('hidden');
            } else {
                btnAdmin.classList.add('hidden'); // Operador comum não vê o botão de Admin
            }
        }
        
        carregarProdutosLoja();
        verificarStatusCaixaLocal();
    } else {
        if (telaLogin) telaLogin.classList.remove('hidden');
        if (appPrincipal) appPrincipal.classList.add('hidden');
    }
}

// --- AUTENTICAÇÃO ---
window.tratarEnterLogin = function(e) { if (e.key === 'Enter') window.processarAutenticacao(); }

window.processarAutenticacao = async function() {
    const email = document.getElementById('authEmail')?.value.trim();
    const senha = document.getElementById('authSenha')?.value.trim();

    if (!email || !senha) {
        alert("Preencha o e-mail e a senha.");
        return;
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;

        if (data && data.user) {
            localStorage.setItem('pdv_usuario_email', data.user.email);
            localStorage.setItem('pdv_loja_id', data.user.id);

            // Verificar se está cadastrado na tabela de operadores
            const { data: opData } = await window.supabaseClient
                .from('operadores')
                .select('*')
                .eq('email', data.user.email)
                .maybeSingle();

            if (opData) {
                localStorage.setItem('pdv_cargo_operador', opData.cargo);
                if (opData.cargo === 'admin_mercado' || opData.cargo === 'admin') {
                    localStorage.setItem('pdv_is_admin', 'true');
                } else {
                    localStorage.removeItem('pdv_is_admin');
                }
            } else {
                localStorage.setItem('pdv_is_admin', 'true');
            }

            verificarSessaoEAlternarTelas();
            carregarFaturamentoDiarioResumo();
        }
    } catch (e) {
        alert("Erro ao autenticar: " + (e.message || e));
    }
}

window.alternarTelaAuth = function(tipo) {
    const titulo = document.getElementById('tituloAuth');
    const sub = document.getElementById('subtituloAuth');
    const btn = document.getElementById('btnAcaoAuth');
    const divPerfil = document.getElementById('divTipoPerfil');
    const divNome = document.getElementById('divNomeMercadoCadastro');
    const divDoc = document.getElementById('divDocumentoCadastro');
    const divEnd = document.getElementById('divCamposEnderecoCadastro');
    const linkVoltar = document.getElementById('linkVoltarLogin');
    const linksAux = document.getElementById('linksAuxiliares');

    if (tipo === 'cadastro') {
        if (titulo) titulo.innerText = "Criar Estabelecimento";
        if (sub) sub.innerText = "Cadastre sua loja e comece a vender";
        if (btn) btn.innerText = "Cadastrar e Acessar";
        if (divPerfil) divPerfil.classList.remove('hidden');
        if (divNome) divNome.classList.remove('hidden');
        if (divDoc) divDoc.classList.remove('hidden');
        if (divEnd) divEnd.classList.remove('hidden');
        if (linkVoltar) linkVoltar.classList.remove('hidden');
        if (linksAux) linksAux.classList.add('hidden');
    } else {
        if (titulo) titulo.innerText = "PDV-VS Enterprise";
        if (sub) sub.innerText = "Sistema de Gestão Comercial e PDV";
        if (btn) btn.innerText = "Acessar Sistema";
        if (divPerfil) divPerfil.classList.add('hidden');
        if (divNome) divNome.classList.add('hidden');
        if (divDoc) divDoc.classList.add('hidden');
        if (divEnd) divEnd.classList.add('hidden');
        if (linkVoltar) linkVoltar.classList.add('hidden');
        if (linksAux) linksAux.classList.remove('hidden');
    }
}

window.realizarLogout = function() {
    localStorage.removeItem('pdv_loja_id');
    localStorage.removeItem('pdv_usuario_email');
    localStorage.removeItem('pdv_is_admin');
    localStorage.removeItem('pdv_cargo_operador');
    window.location.reload();
}

window.atualizarPaginaCompleta = function() { window.location.reload(); }

// --- CONTROLE DE CAIXA (FUNÇÕES INTEGRADAS) ---
window.abrirCaixaModal = function() {
    caixaAbertoLoja = true;
    localStorage.setItem('pdv_caixa_status', 'aberto');
    atualizarInterfaceCaixaStatus();
    alert("Caixa aberto com sucesso!");
}

window.fecharCaixaModal = function() {
    if (confirm("Deseja realmente fechar o caixa?")) {
        caixaAbertoLoja = false;
        localStorage.setItem('pdv_caixa_status', 'fechado');
        atualizarInterfaceCaixaStatus();
        alert("Caixa fechado.");
    }
}

window.gerenciarCaixaModal = function() {
    // Caso haja um modal próprio de caixa ou clique direto
    if (!caixaAbertoLoja) {
        window.abrirCaixaModal();
    } else {
        window.fecharCaixaModal();
    }
}

window.fecharModalCaixa = function() {
    const modal = document.getElementById('modalCaixa');
    if (modal) modal.classList.add('hidden');
}

function verificarStatusCaixaLocal() {
    const statusSalvo = localStorage.getItem('pdv_caixa_status');
    caixaAbertoLoja = (statusSalvo === 'aberto');
    atualizarInterfaceCaixaStatus();
}

function atualizarInterfaceCaixaStatus() {
    const indicadorTopo = document.getElementById('txtStatusCaixaTopo');
    if (indicadorTopo) {
        indicadorTopo.innerText = caixaAbertoLoja ? "CAIXA ABERTO" : "CAIXA FECHADO";
        indicadorTopo.className = caixaAbertoLoja ? "text-emerald-600 font-bold" : "text-amber-600 font-bold";
    }
}

// --- PRODUTOS E BUSCA ---
async function carregarProdutosLoja() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    if (!lojaId) return;
    try {
        const { data, error } = await window.supabaseClient.from('produtos').select('*').eq('loja_id', lojaId);
        if (error) throw error;
        produtosLojaCache = data || [];
        renderizarTabelaAdminProdutos();
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

window.aoDigitarBusca = function(termo) {
    const painel = document.getElementById('painelSugestoes');
    if (!painel) return;
    if (!termo || termo.trim().length < 1) {
        painel.classList.add('hidden');
        return;
    }

    const filtrados = produtosLojaCache.filter(p => 
        p.nome.toLowerCase().includes(termo.toLowerCase()) || 
        (p.codigo && p.codigo.toLowerCase().includes(termo.toLowerCase()))
    ).slice(0, 10);

    if (filtrados.length > 0) {
        painel.innerHTML = '';
        filtrados.forEach(prod => {
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
}

window.tratarEnterBuscaCaixa = function(e) {
    if (e.key === 'Enter') {
        const termo = e.target.value.trim();
        if (!termo) return;
        const prod = produtosLojaCache.find(p => p.codigo === termo || p.nome.toLowerCase().includes(termo.toLowerCase()));
        if (prod) {
            adicionarProdutoAoCarrinho(prod);
            e.target.value = '';
            document.getElementById('painelSugestoes').classList.add('hidden');
        } else {
            alert("Produto não encontrado!");
        }
    }
}

window.adicionarProdutoAoCarrinho = function(produto) {
    const item = window.carrinhoVenda.find(i => i.id === produto.id);
    if (item) {
        item.quantidade += 1;
        item.subtotal = item.quantidade * item.preco;
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

    let total = 0, qtdCount = 0;
    window.carrinhoVenda.forEach((item, index) => {
        total += item.subtotal;
        qtdCount += item.quantidade;
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2 font-medium text-slate-800">${item.nome}</td>
                <td class="p-2"><input type="number" step="${item.unidade === 'KG' ? '0.001' : '1'}" value="${item.quantidade}" onchange="atualizarQtdItem(${index}, this.value)" class="w-20 p-1 border rounded text-xs text-center font-bold"></td>
                <td class="p-2 text-slate-600">R$ ${item.preco.toFixed(2)}</td>
                <td class="p-2 font-bold text-slate-900">R$ ${item.subtotal.toFixed(2)}</td>
                <td class="p-2 text-center"><button onclick="removerItem(${index})" class="text-rose-500 hover:text-rose-700 p-1"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });

    document.getElementById('txtSubtotal').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('txtTotal').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('contadorItens').innerText = `${qtdCount} itens`;
}

window.atualizarQtdItem = function(index, val) {
    const q = Number(val);
    if (q <= 0) { removerItem(index); return; }
    window.carrinhoVenda[index].quantidade = q;
    window.carrinhoVenda[index].subtotal = q * window.carrinhoVenda[index].preco;
    renderizarCarrinho();
}

window.removerItem = function(index) {
    window.carrinhoVenda.splice(index, 1);
    renderizarCarrinho();
}

window.cancelarVenda = function() {
    if (window.carrinhoVenda.length > 0 && confirm("Deseja cancelar a venda?")) {
        window.carrinhoVenda = [];
        renderizarCarrinho();
    }
}

// --- PAINEL ADMINISTRATIVO E ABAS ---
window.abrirPainelAdmin = function() {
    document.getElementById('modalAdmin')?.classList.remove('hidden');
    mudarAbaAdmin('produtos');
    carregarProdutosLoja();
}

window.fecharPainelAdmin = function() {
    document.getElementById('modalAdmin')?.classList.add('hidden');
}

window.mudarAbaAdmin = function(aba) {
    const abas = ['produtos', 'operadores', 'maquininhas', 'historico', 'configuracoes'];
    abas.forEach(a => {
        const conteudo = document.getElementById(`conteudoAba${a.charAt(0).toUpperCase() + a.slice(1)}`);
        const btn = document.getElementById(`btnAba${a.charAt(0).toUpperCase() + a.slice(1)}`);
        if (conteudo) conteudo.classList.add('hidden');
        if (btn) {
            btn.className = "px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg";
        }
    });

    const abaAtivaConteudo = document.getElementById(`conteudoAba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
    const abaAtivaBtn = document.getElementById(`btnAba${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
    if (abaAtivaConteudo) abaAtivaConteudo.classList.remove('hidden');
    if (abaAtivaBtn) {
        abaAtivaBtn.className = "px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg";
    }

    if (aba === 'produtos') carregarProdutosLoja();
    if (aba === 'operadores') carregarOperadoresAdmin();
    if (aba === 'maquininhas') carregarMaquininhasAdmin();
    if (aba === 'historico') carregarHistoricoAdmin();
}

function renderizarTabelaAdminProdutos(filtro = '') {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contador = document.getElementById('contadorLimiteProdutosAdmin');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtrados = produtosLojaCache.filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()) || (p.codigo && p.codigo.includes(filtro)));
    if (contador) contador.innerText = `${produtosLojaCache.length} / 800 produtos`;

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>`;
        return;
    }

    filtrados.forEach(p => {
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50 text-xs">
                <td class="p-2 font-mono">${p.codigo || '-'}</td>
                <td class="p-2 font-medium text-slate-800">${p.nome}</td>
                <td class="p-2 font-bold text-emerald-700">R$ ${Number(p.preco).toFixed(2)}</td>
                <td class="p-2">${p.estoque || 0} ${p.unidade || 'UN'}</td>
                <td class="p-2 text-center">
                    <button onclick="deletarProdutoAdmin('${p.id}')" class="text-rose-500 hover:text-rose-700 p-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.filtrarTabelaAdmin = function(val) { renderizarTabelaAdminProdutos(val); }

window.abrirModalNovoProdutoAdmin = function() {
    document.getElementById('formProdId').value = '';
    document.getElementById('formNome').value = '';
    document.getElementById('formCodigo').value = '';
    document.getElementById('formPreco').value = '';
    document.getElementById('formEstoque').value = '';
    document.getElementById('modalFormProduto')?.classList.remove('hidden');
}

window.fecharFormProduto = function() {
    document.getElementById('modalFormProduto')?.classList.add('hidden');
}

window.salvarProdutoAdmin = async function() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    const nome = document.getElementById('formNome').value.trim();
    const codigo = document.getElementById('formCodigo').value.trim();
    const preco = Number(document.getElementById('formPreco').value);
    const estoque = Number(document.getElementById('formEstoque').value) || 0;
    const unidade = document.getElementById('formUnidade').value;

    if (!nome || !preco) {
        alert("Preencha o nome e o preço do produto.");
        return;
    }

    try {
        const { error } = await window.supabaseClient.from('produtos').insert([{
            loja_id: lojaId,
            nome,
            codigo,
            preco,
            estoque,
            unidade
        }]);

        if (error) throw error;
        alert("Produto cadastrado com sucesso!");
        fecharFormProduto();
        carregarProdutosLoja();
    } catch (e) {
        alert("Erro ao salvar produto: " + e.message);
    }
}

window.deletarProdutoAdmin = async function(id) {
    if (!confirm("Deseja excluir este produto?")) return;
    try {
        const { error } = await window.supabaseClient.from('produtos').delete().eq('id', id);
        if (error) throw error;
        carregarProdutosLoja();
    } catch (e) {
        alert("Erro ao excluir: " + e.message);
    }
}

// --- GESTÃO DE OPERADORES E STATUS REAL DO CAIXA ---
async function carregarOperadoresAdmin() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    const tbody = document.getElementById('tabelaOperadoresLoja');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Carregando operadores...</td></tr>`;

    try {
        const { data, error } = await window.supabaseClient
            .from('operadores')
            .select('*')
            .eq('loja_id', lojaId);

        const emailAtual = localStorage.getItem('pdv_usuario_email') || 'Administrador';
        const statusTexto = caixaAbertoLoja ? "Aberto" : "Fechado";
        const badgeCorStatus = caixaAbertoLoja ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-amber-100 text-amber-800 font-bold";

        let htmlRows = `
            <tr class="border-b text-xs hover:bg-slate-50">
                <td class="p-3 font-bold text-slate-800">${emailAtual} (Admin Principal)</td>
                <td class="p-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Administrador</span></td>
                <td class="p-3 text-center"><span class="${badgeCorStatus} px-2 py-0.5 rounded">${statusTexto}</span></td>
                <td class="p-3 text-center">-</td>
            </tr>
        `;

        if (data && data.length > 0) {
            data.forEach(op => {
                const cargoFormatado = (op.cargo === 'admin_mercado' || op.cargo === 'admin') ? 'Administrador' : 'Operador de Caixa';
                const badgeCor = cargoFormatado === 'Administrador' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
                
                htmlRows += `
                    <tr class="border-b text-xs hover:bg-slate-50">
                        <td class="p-3 font-bold text-slate-800">${op.email || op.nome || 'Operador'}</td>
                        <td class="p-3"><span class="${badgeCor} px-2 py-0.5 rounded font-bold">${cargoFormatado}</span></td>
                        <td class="p-3 text-center"><span class="${badgeCorStatus} px-2 py-0.5 rounded">${statusTexto}</span></td>
                        <td class="p-3 text-center">
                            <button onclick="deletarOperador('${op.id}')" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        tbody.innerHTML = htmlRows;
    } catch (e) {
        console.error("Erro ao carregar operadores:", e);
    }
}

window.abrirModalNovoOperador = function() {
    const emailOp = prompt("Digite o e-mail do novo operador/caixa:");
    if (!emailOp) return;
    const cargoOp = confirm("Este operador será Administrador do Estabelecimento? (OK para Sim, Cancelar para Operador de Caixa comum)") ? 'admin_mercado' : 'operador';
    
    cadastrarNovoOperadorSistema(emailOp, cargoOp);
}

async function cadastrarNovoOperadorSistema(email, cargo) {
    const lojaId = localStorage.getItem('pdv_loja_id');
    try {
        const { error } = await window.supabaseClient.from('operadores').insert([{
            loja_id: lojaId,
            email: email,
            cargo: cargo,
            status: 'ativo'
        }]);

        if (error) throw error;
        alert("Operador cadastrado com sucesso!");
        carregarOperadoresAdmin();
    } catch (e) {
        alert("Erro ao cadastrar operador: " + e.message);
    }
}

window.deletarOperador = async function(id) {
    if (confirm("Deseja remover este operador da lista?")) {
        try {
            await window.supabaseClient.from('operadores').delete().eq('id', id);
            carregarOperadoresAdmin();
        } catch (e) {
            alert("Erro ao remover: " + e.message);
        }
    }
}

// --- MAQUININHAS ---
async function carregarMaquininhasAdmin() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    const tbody = document.getElementById('tabelaMaquininhasAdmin');
    if (!tbody) return;
    try {
        const { data, error } = await window.supabaseClient.from('maquininhas').select('*').eq('loja_id', lojaId);
        if (error) throw error;
        maquininhasCadastradasLoja = data || [];
        tbody.innerHTML = '';
        if (maquininhasCadastradasLoja.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma maquininha cadastrada.</td></tr>`;
            return;
        }
        maquininhasCadastradasLoja.forEach(m => {
            tbody.innerHTML += `
                <tr class="border-b text-xs">
                    <td class="p-3 font-bold">${m.nome}</td>
                    <td class="p-3">Déb: ${m.taxa_debito}% | Créd: ${m.taxa_credito_avista}%</td>
                    <td class="p-3">2x: ${m.taxa_2x || 0}% | 3x: ${m.taxa_3x || 0}%</td>
                    <td class="p-3 text-center"><button onclick="deletarMaquininha('${m.id}')" class="text-rose-500"><i class="fa-solid fa-trash"></i></button></td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

window.abrirModalNovaMaquininha = function() { document.getElementById('modalNovaMaquininha')?.classList.remove('hidden'); }
window.fecharModalNovaMaquininha = function() { document.getElementById('modalNovaMaquininha')?.classList.add('hidden'); }

window.salvarNovaMaquininha = async function() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    const nome = document.getElementById('maqNome').value.trim();
    if (!nome) { alert("Informe o nome da maquininha."); return; }
    try {
        const { error } = await window.supabaseClient.from('maquininhas').insert([{
            loja_id: lojaId,
            nome,
            taxa_debito: Number(document.getElementById('maqDebito').value) || 0,
            taxa_credito_avista: Number(document.getElementById('maqCreditoAvista').value) || 0,
            taxa_2x: Number(document.getElementById('maq2x').value) || 0,
            taxa_3x: Number(document.getElementById('maq3x').value) || 0,
            taxa_6x: Number(document.getElementById('maq6x').value) || 0,
            taxa_12x: Number(document.getElementById('maq12x').value) || 0
        }]);
        if (error) throw error;
        fecharModalNovaMaquininha();
        carregarMaquininhasAdmin();
    } catch (e) { alert("Erro: " + e.message); }
}

window.deletarMaquininha = async function(id) {
    if (confirm("Excluir maquininha?")) {
        await window.supabaseClient.from('maquininhas').delete().eq('id', id);
        carregarMaquininhasAdmin();
    }
}

// --- CÂMERA / QR CODE ---
window.abrirLeitorCamera = function() {
    alert("Para escanear via câmera, certifique-se de acessar por HTTPS ou localhost com permissão concedida.");
}

// --- FINALIZAÇÃO DE VENDA ---
window.finalizarVenda = async function() {
    if (!caixaAbertoLoja) {
        alert("O caixa está fechado! Abra o caixa para realizar vendas.");
        return;
    }
    if (window.carrinhoVenda.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }
    document.getElementById('modalFinalizarVenda')?.classList.remove('hidden');
    selecionarFormaPagamento('dinheiro');
    const total = window.carrinhoVenda.reduce((acc, i) => acc + i.subtotal, 0);
    document.getElementById('modalValTotalOriginal').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('modalValFinalComJuros').innerText = `R$ ${total.toFixed(2)}`;
}

window.fecharModalFinalizarVenda = function() { document.getElementById('modalFinalizarVenda')?.classList.add('hidden'); }

window.selecionarFormaPagamento = function(tipo) {
    formaPagamentoAtual = tipo;
    ['Dinheiro', 'Pix', 'Debito', 'Credito'].forEach(t => {
        const btn = document.getElementById(`btnForma${t}`);
        if (btn) btn.className = "py-2.5 px-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition text-center";
    });
    const map = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Debito', credito: 'Credito' };
    document.getElementById(`btnForma${map[tipo]}`)?.setAttribute('class', "py-2.5 px-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition text-center");
}

window.confirmarConclusaoVenda = async function() {
    const total = window.carrinhoVenda.reduce((acc, i) => acc + i.subtotal, 0);
    const lojaId = localStorage.getItem('pdv_loja_id');
    const operador = localStorage.getItem('pdv_usuario_email');

    try {
        const { error } = await window.supabaseClient.from('vendas').insert([{
            empresa_id: lojaId,
            operador,
            forma_pagamento: formaPagamentoAtual,
            valor_original: total,
            valor_total: total,
            itens: window.carrinhoVenda
        }]);

        if (error) throw error;
        alert("Venda concluída com sucesso!");
        window.carrinhoVenda = [];
        renderizarCarrinho();
        fecharModalFinalizarVenda();
        carregarFaturamentoDiarioResumo();
    } catch (e) {
        alert("Erro ao concluir venda: " + e.message);
    }
}

async function carregarFaturamentoDiarioResumo() {
    const lojaId = localStorage.getItem('pdv_loja_id');
    if (!lojaId) return;
    try {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const { data } = await window.supabaseClient.from('vendas').select('valor_total').eq('empresa_id', lojaId).gte('created_at', hoje.toISOString());
        let total = 0;
        data?.forEach(v => total += Number(v.valor_total) || 0);
        const el = document.getElementById('txtFaturamentoDia');
        if (el) el.innerText = `R$ ${total.toFixed(2)}`;
    } catch (e) { console.warn(e); }
}

async function carregarHistoricoAdmin() {
    carregarFaturamentoDiarioResumo();
}

function inicializarEventosPDV() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') { e.preventDefault(); document.getElementById('inputBusca')?.focus(); }
        else if (e.key === 'F9') { e.preventDefault(); finalizarVenda(); }
        else if (e.key === 'Escape') { fecharModalFinalizarVenda(); fecharPainelAdmin(); }
    });
}

window.recarregarDadosAdmin = carregarProdutosLoja;
window.abrirModalCancelarItem = function() {};
window.salvarConfiguracoesEmpresaAdmin = function() {};
window.salvarPinAdmin = function() {};
window.escanearCameraAdmin = function() {};