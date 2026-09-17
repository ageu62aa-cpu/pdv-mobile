const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioAtual = null, empresaAtualId = null, dadosEmpresaAtual = null, cargoUsuarioAtual = null;
let modoTelaAuth = 'login', caixaAberto = false, faturamentoDia = 0, itensVenda = [], produtosCache = [];
let historicoVendasCache = [], html5QrcodeInstance = null, origemLeitor = 'busca';
let acaoCaixaAtual = 'abrir', indiceItemParaRemover = null, deferredPrompt = null;

// ==========================================
// 1. INICIALIZAÇÃO E PWA
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) { 
            usuarioAtual = session.user; 
            await validarVinculoEmpresaUsuario(); 
        }
    } catch (e) { 
        console.error("Erro ao restaurar sessão:", e); 
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e;
    const btnInstalar = document.getElementById('btnInstalarPwa');
    if (btnInstalar) btnInstalar.classList.remove('hidden');
});

async function instalarPwaApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            const btnInstalar = document.getElementById('btnInstalarPwa');
            if (btnInstalar) btnInstalar.classList.add('hidden');
        }
        deferredPrompt = null;
    } else {
        alert('Instale diretamente pelas configurações ou menu do seu navegador.');
    }
}

// ==========================================
// 2. SUPER ADMIN (GATILHO SECRETO)
// ==========================================
let cliquesSecretos = 0;
document.addEventListener('DOMContentLoaded', () => {
    const gatilho = document.getElementById('gatilhoSuperAdmin');
    if (gatilho) {
        gatilho.addEventListener('click', () => {
            cliquesSecretos++;
            if (cliquesSecretos >= 5) {
                cliquesSecretos = 0;
                document.getElementById('telaLoginSuperAdmin').classList.remove('hidden');
                setTimeout(() => document.getElementById('superAdminEmail').focus(), 100);
            }
        });
    }
});

function fecharTelaSuperAdmin() { 
    document.getElementById('telaLoginSuperAdmin').classList.add('hidden'); 
}

async function logarSuperAdmin() {
    const email = document.getElementById('superAdminEmail').value.trim();
    const senha = document.getElementById('superAdminSenha').value.trim();
    const fb = document.getElementById('feedbackSuperAdmin');
    fb.classList.add('hidden');
    
    if (email === 'vancely@admin.com' && senha === 'vancely2026') {
        fecharTelaSuperAdmin(); 
        await abrirSuperAdminMaster();
    } else {
        fb.innerText = 'Credenciais inválidas.'; 
        fb.classList.remove('hidden');
    }
}

async function abrirSuperAdminMaster() {
    document.getElementById('modalSuperAdminMaster').classList.remove('hidden');
    await carregarListaClientesSuperAdmin();
}

function fecharSuperAdminMaster() { 
    document.getElementById('modalSuperAdminMaster').classList.add('hidden'); 
}

async function carregarListaClientesSuperAdmin() {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    try {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Buscando estabelecimentos...</td></tr>';
        const { data, error } = await supabaseClient.from('empresas').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        window.listaEmpresasCache = data || [];
        renderizarTabelaSuperAdmin(window.listaEmpresasCache);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-rose-500">Erro ao carregar dados.</td></tr>';
    }
}

function renderizarTabelaSuperAdmin(lista) {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!lista || lista.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Nenhum cadastrado.</td></tr>'; 
        return; 
    }
    
    let html = '';
    lista.forEach(emp => {
        const statusBadge = emp.ativo 
            ? '<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">ATIVO</span>' 
            : '<span class="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">BLOQUEADO</span>';
        
        html += `<tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${emp.nome_mercado}</td>
            <td class="p-3">${emp.responsavel}</td>
            <td class="p-3">${emp.documento}</td>
            <td class="p-3 text-xs">${emp.email_admin}</td>
            <td class="p-3 text-center">${statusBadge}</td>
            <td class="p-3 text-center">
                <button onclick="alternarStatusEmpresa('${emp.id}', ${emp.ativo})" class="${emp.ativo ? 'bg-rose-600' : 'bg-emerald-600'} text-white px-2.5 py-1 rounded text-xs font-semibold shadow">
                    ${emp.ativo ? 'Bloquear' : 'Ativar'}
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function filtrarClientesSuperAdmin(termo) {
    if (!window.listaEmpresasCache) return;
    const termoLower = termo.toLowerCase();
    const filtrados = window.listaEmpresasCache.filter(e => 
        e.nome_mercado.toLowerCase().includes(termoLower) || e.documento.toLowerCase().includes(termoLower)
    );
    renderizarTabelaSuperAdmin(filtrados);
}

async function alternarStatusEmpresa(empresaId, statusAtual) {
    if (!confirm(`Deseja realmente alterar o status comercial?`)) return;
    const { error } = await supabaseClient.from('empresas').update({ ativo: !statusAtual }).eq('id', empresaId);
    if (!error) { 
        alert('Status atualizado com sucesso!'); 
        await carregarListaClientesSuperAdmin(); 
    } else {
        alert('Erro ao atualizar status: ' + error.message);
    }
}

// ==========================================
// 3. AUTENTICAÇÃO E SESSÃO
// ==========================================
function alternarTelaAuth(modo) {
    modoTelaAuth = modo;
    const fields = {
        titulo: document.getElementById('tituloAuth'), 
        subtitulo: document.getElementById('subtituloAuth'),
        icone: document.getElementById('iconeAuth'), 
        btn: document.getElementById('btnAcaoAuth'),
        divSenha: document.getElementById('divAuthSenha'), 
        links: document.getElementById('linksAuxiliares'),
        voltar: document.getElementById('linkVoltarLogin'), 
        perfil: document.getElementById('divTipoPerfil'),
        mercado: document.getElementById('divNomeMercadoCadastro'), 
        doc: document.getElementById('divDocumentoCadastro')
    };
    document.getElementById('feedbackAuth').classList.add('hidden');

    if (modo === 'login') {
        fields.titulo.innerText = 'PDV-VS Enterprise'; 
        fields.btn.innerText = 'Acessar Sistema';
        fields.icone.className = 'fa-solid fa-cash-register text-4xl text-emerald-600 mb-2';
        fields.divSenha.classList.remove('hidden'); 
        fields.links.classList.remove('hidden');
        fields.voltar.classList.add('hidden'); 
        fields.perfil.classList.add('hidden');
        fields.mercado.classList.add('hidden'); 
        fields.doc.classList.add('hidden');
    } else if (modo === 'cadastro') {
        fields.titulo.innerText = 'Novo Estabelecimento'; 
        fields.btn.innerText = 'Criar Conta';
        fields.icone.className = 'fa-solid fa-store text-4xl text-blue-600 mb-2';
        fields.voltar.classList.remove('hidden'); 
        fields.perfil.classList.remove('hidden');
        fields.mercado.classList.remove('hidden'); 
        fields.doc.classList.remove('hidden');
        fields.links.classList.add('hidden');
    }
}

function tratarEnterLogin(e) { 
    if (e.key === 'Enter') { e.preventDefault(); processarAutenticacao(); } 
}

async function processarAutenticacao() {
    const email = document.getElementById('authEmail').value.trim();
    const senha = document.getElementById('authSenha').value.trim();
    if (!email) { mostrarFeedback('Por favor, informe o e-mail.', 'rose'); return; }

    try {
        if (modoTelaAuth === 'login' || modoTelaAuth === 'admin') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;
            usuarioAtual = data.user; 
            await validarVinculoEmpresaUsuario();
        } else if (modoTelaAuth === 'cadastro') {
            const nomeMercado = document.getElementById('authNomeMercado').value.trim();
            const documento = document.getElementById('authDocumento').value.trim();
            const tipoPerfil = document.getElementById('selectTipoPerfil').value;

            const { data: authData, error: authError } = await supabaseClient.auth.signUp({ 
                email, 
                password: senha, 
                options: { data: { perfil: tipoPerfil } } 
            });
            if (authError) throw authError;

            const prefixoResponsavel = email.split('@')[0];
            const { data: empData, error: empError } = await supabaseClient.from('empresas').insert([{ 
                nome_mercado: nomeMercado, 
                responsavel: prefixoResponsavel, 
                documento, 
                email_admin: email, 
                ativo: true 
            }]).select().single();
            
            if (empError) throw empError;

            await supabaseClient.from('usuarios_empresas').insert([{ 
                user_id: authData.user.id, 
                empresa_id: empData.id, 
                cargo: tipoPerfil 
            }]);
            
            alert('Estabelecimento cadastrado! Faça o login para iniciar.'); 
            alternarTelaAuth('login');
        }
    } catch (e) { 
        mostrarFeedback(e.message, 'rose'); 
    }
}

async function validarVinculoEmpresaUsuario() {
    try {
        const { data: vincData, error: vincError } = await supabaseClient.from('usuarios_empresas').select('empresa_id, cargo').eq('user_id', usuarioAtual.id).single();
        if (vincError || !vincData) throw new Error('Vínculo comercial não encontrado.');
        
        empresaAtualId = vincData.empresa_id; 
        cargoUsuarioAtual = vincData.cargo;
        
        const { data: empData } = await supabaseClient.from('empresas').select('*').eq('id', empresaAtualId).single();
        if (empData.ativo === false) {
            await supabaseClient.auth.signOut(); 
            alert('ACESSO SUSPENSO: Este estabelecimento encontra-se bloqueado por pendência financeira.'); 
            location.reload(); 
            return;
        }
        dadosEmpresaAtual = empData; 
        concluirLoginSucesso(cargoUsuarioAtual);
    } catch (e) { 
        await supabaseClient.auth.signOut(); 
        mostrarFeedback(e.message, 'rose'); 
    }
}

function mostrarFeedback(msg, cor) {
    const fb = document.getElementById('feedbackAuth'); 
    fb.innerText = msg;
    fb.className = `text-xs text-center text-${cor}-600 font-semibold mt-2`; 
    fb.classList.remove('hidden');
}

function concluirLoginSucesso(cargoUser) {
    const usuarioNomeExibicao = usuarioAtual.email.split('@')[0];
    document.getElementById('infoUsuarioLogado').innerText = `${usuarioNomeExibicao} (${cargoUser === 'admin_mercado' ? 'Admin' : 'Caixa'})`;
    document.getElementById('tituloAppEmpresa').innerText = dadosEmpresaAtual.nome_mercado;
    document.getElementById('badgeEmpresaLogada').innerText = `CNPJ: ${dadosEmpresaAtual.documento}`;
    
    const btnAdminMenu = document.getElementById('btnAdminMenu');
    if(btnAdminMenu) btnAdminMenu.classList.toggle('hidden', cargoUser !== 'admin_mercado');
    
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('appPrincipal').classList.remove('hidden');
    carregarProdutosCache(); 
    focarBusca();
}

async function realizarLogout() { 
    await supabaseClient.auth.signOut(); 
    location.reload(); 
}

// ==========================================
// 4. MÓDULO DE CAIXA E VENDAS
// ==========================================
window.addEventListener('keydown', (e) => {
    const appPrincipal = document.getElementById('appPrincipal');
    if (!appPrincipal || appPrincipal.classList.contains('hidden')) return;
    
    if (e.key === 'F1') { e.preventDefault(); gerenciarCaixaModal('abrir'); }
    if (e.key === 'F2') { e.preventDefault(); gerenciarCaixaModal('fechar'); }
    if (e.key === 'F5') { e.preventDefault(); focarBusca(); }
    if (e.key === 'F6') { e.preventDefault(); abrirModalCancelarItem(); }
    if (e.key === 'F7') { e.preventDefault(); cancelarVenda(); }
    if (e.key === 'F9') { e.preventDefault(); finalizarVenda(); }
});

function focarBusca() { 
    const input = document.getElementById('inputBusca');
    if(input) input.focus(); 
}

function gerenciarCaixaModal(tipo) {
    acaoCaixaAtual = tipo;
    const modal = document.getElementById('modalCaixa');
    document.getElementById('tituloModalCaixa').innerText = tipo === 'abrir' ? 'Abertura de Caixa' : 'Fechamento de Caixa';
    document.getElementById('resumoFechamentoCaixa').classList.toggle('hidden', tipo === 'abrir');
    if (tipo === 'fechar') document.getElementById('valFaturamentoOperador').innerText = `R$ ${faturamentoDia.toFixed(2)}`;
    modal.classList.remove('hidden');
}

function fecharModalCaixa() { 
    document.getElementById('modalCaixa').classList.add('hidden'); 
}

function confirmarAcaoCaixa() {
    caixaAberto = (acaoCaixaAtual === 'abrir');
    const badges = document.querySelectorAll('.badgeCaixaStatus');
    badges.forEach(b => {
        b.innerText = caixaAberto ? 'ABERTO' : 'FECHADO';
        b.className = caixaAberto 
            ? 'badgeCaixaStatus text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded font-semibold' 
            : 'badgeCaixaStatus text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded font-semibold';
    });
    if (!caixaAberto) { 
        faturamentoDia = 0; 
        const txtFat = document.getElementById('txtFaturamentoDia');
        if(txtFat) txtFat.innerText = 'R$ 0,00'; 
    }
    fecharModalCaixa();
}

async function carregarProdutosCache() {
    if(!empresaAtualId) return;
    const { data } = await supabaseClient.from('produtos').select('*').eq('empresa_id', empresaAtualId).order('nome', { ascending: true });
    if (data) produtosCache = data;
}

function aoDigitarBusca(termo) {
    const painel = document.getElementById('painelSugestoes');
    if (!painel) return;
    if (termo.length < 2) { painel.classList.add('hidden'); return; }
    
    const termoLower = termo.toLowerCase();
    const filtrados = produtosCache.filter(p => p.nome.toLowerCase().includes(termoLower) || (p.codigo && p.codigo.toLowerCase().includes(termoLower)));
    let html = '';
    filtrados.forEach(p => {
        const prodString = JSON.stringify(p).replace(/"/g, '&quot;');
        html += `<div onclick="adicionarItemVendaPorObjeto('${prodString}')" class="p-3 hover:bg-slate-50 cursor-pointer border-b flex justify-between text-sm"> <div><span class="font-semibold text-slate-800">${p.nome}</span><span class="text-xs text-slate-400 block">Cód: ${p.codigo || 'N/A'}</span></div> <b>R$ ${Number(p.preco).toFixed(2)}</b> </div>`;
    });
    painel.innerHTML = html || '<div class="p-3 text-xs text-slate-400">Nenhum produto encontrado.</div>';
    painel.classList.remove('hidden');
}

function adicionarItemVendaPorObjeto(prodStr) {
    try {
        const p = JSON.parse(prodStr.replace(/&quot;/g, '"'));
        adicionarItemVenda(p);
    } catch(err) {
        console.error("Erro ao parsear item:", err);
    }
}

// COMPATÍVEL COM LEITORES FÍSICOS USB E BLUETOOTH (DISPARA NO ENTER)
function tratarEnterBuscaCaixa(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const termo = e.target.value.trim().toLowerCase();
        if (!termo) return;
        
        const p = produtosCache.find(prod => (prod.codigo && prod.codigo.toLowerCase() === termo) || prod.nome.toLowerCase() === termo);
        if (p) {
            adicionarItemVenda(p);
        } else {
            const pParcial = produtosCache.find(prod => prod.nome.toLowerCase().includes(termo) || (prod.codigo && prod.codigo.toLowerCase().includes(termo)));
            if (pParcial) adicionarItemVenda(pParcial);
            else alert('Produto não encontrado!');
        }
    }
}

function adicionarItemVenda(produto) {
    const painel = document.getElementById('painelSugestoes');
    if(painel) painel.classList.add('hidden');
    
    const inputBusca = document.getElementById('inputBusca');
    if(inputBusca) {
        inputBusca.value = '';
        inputBusca.focus();
    }
    
    const existente = itensVenda.find(i => i.id === produto.id);
    if (existente) { 
        existente.qtd += 1; 
    } else { 
        itensVenda.push({ ...produto, qtd: 1 }); 
    }
    atualizarTabelaVenda();
}

function atualizarTabelaVenda() {
    const tbody = document.getElementById('tabelaItensVenda');
    const contador = document.getElementById('contadorItens');
    if(contador) contador.innerText = `${itensVenda.length} itens`;
    
    if (itensVenda.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto adicionado na venda.</td></tr>'; 
        document.getElementById('txtSubtotal').innerText = 'R$ 0,00'; 
        document.getElementById('txtTotal').innerText = 'R$ 0,00'; 
        return; 
    }
    
    let html = '', total = 0;
    itensVenda.forEach((item, i) => {
        total += item.qtd * item.preco;
        html += `<tr class="border-b">
            <td class="p-2">${item.nome}</td>
            <td class="p-2"><input type="number" min="1" value="${item.qtd}" onchange="alterarQtd(${i}, this.value)" class="w-12 text-center border rounded"></td>
            <td class="p-2">R$ ${Number(item.preco).toFixed(2)}</td>
            <td class="p-2 font-bold">R$ ${(item.qtd * item.preco).toFixed(2)}</td>
            <td class="p-2 text-center"><button onclick="solicitarRemocaoItem(${i})" class="text-rose-500"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    document.getElementById('txtSubtotal').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('txtTotal').innerText = `R$ ${total.toFixed(2)}`;
}

function alterarQtd(i, qtd) { 
    const q = parseInt(qtd); 
    if (q > 0) { itensVenda[i].qtd = q; atualizarTabelaVenda(); } 
}

function salvarPinAdmin() {
    const pin = document.getElementById('inputAdminPinConfig').value.trim();
    if(!pin) { alert('Informe um PIN válido.'); return; }
    localStorage.setItem('pdv_admin_pin_' + empresaAtualId, pin); 
    alert('PIN salvo com sucesso!');
}

function solicitarRemocaoItem(i) {
    indiceItemParaRemover = i; 
    document.getElementById('inputPinAutorizacion').value = '';
    document.getElementById('modalAutorizacaoAdmin').classList.remove('hidden');
}

function confirmarAutorizacaoPin() {
    const pin = document.getElementById('inputPinAutorizacion').value.trim();
    const pinSalvo = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    if (pin === pinSalvo) {
        if (indiceItemParaRemover !== null) { 
            itensVenda.splice(indiceItemParaRemover, 1); 
            atualizarTabelaVenda(); 
        }
        fecharModalAutorizacao();
    } else { 
        alert('PIN gerencial incorreto!'); 
    }
}

function fecharModalAutorizacao() { 
    document.getElementById('modalAutorizacaoAdmin').classList.add('hidden'); 
}

function abrirModalCancelarItem() {
    if (itensVenda.length === 0) { alert('Não há itens na venda.'); return; }
    let html = '';
    itensVenda.forEach((item, index) => {
        html += `<div class="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b" onclick="fecharModalCancelarItem(); solicitarRemocaoItem(${index});"> <div><span class="font-semibold text-slate-800">${item.nome}</span></div> <button class="text-rose-600 text-xs border border-rose-200 rounded px-2 py-1">Remover</button> </div>`;
    });
    document.getElementById('listaItensParaCancelar').innerHTML = html;
    document.getElementById('modalCancelarItem').classList.remove('hidden');
}

function fecharModalCancelarItem() { 
    document.getElementById('modalCancelarItem').classList.add('hidden'); 
}

function cancelarVenda() { 
    if (confirm('Deseja realmente cancelar toda a compra atual?')) { 
        itensVenda = []; 
        atualizarTabelaVenda(); 
    } 
}

async function finalizarVenda() {
    if (!caixaAberto) { alert('O caixa precisa estar aberto! Pressione [F1].'); return; }
    if (itensVenda.length === 0) { alert('Adicione produtos antes de finalizar.'); return; }
    
    let total = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    const { error } = await supabaseClient.from('vendas').insert([{ 
        empresa_id: empresaAtualId, 
        operador: usuarioAtual.email, 
        valor_total: total, 
        itens: itensVenda 
    }]);
    
    if(error) {
        alert('Erro ao registrar venda: ' + error.message);
        return;
    }

    faturamentoDia += total; 
    const txtFat = document.getElementById('txtFaturamentoDia');
    if(txtFat) txtFat.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
    
    itensVenda = []; 
    atualizarTabelaVenda(); 
    alert('Venda concluída e salva com sucesso!');
    focarBusca();
}

// ==========================================
// 5. PAINEL ADMINISTRATIVO
// ==========================================
function mudarAbaAdmin(aba) {
    ['Produtos', 'Operadores', 'Historico'].forEach(a => {
        const conteudo = document.getElementById(`conteudoAba${a}`);
        const btn = document.getElementById(`btnAba${a}`);
        if(conteudo) conteudo.classList.add('hidden');
        if(btn) btn.className = 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg';
    });
    
    const activeAba = aba.charAt(0).toUpperCase() + aba.slice(1);
    const conteudoAtivo = document.getElementById(`conteudoAba${activeAba}`);
    const btnAtivo = document.getElementById(`btnAba${activeAba}`);
    
    if(conteudoAtivo) conteudoAtivo.classList.remove('hidden');
    if(btnAtivo) btnAtivo.className = 'px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg';
    
    if (aba === 'operadores') carregarOperadoresLoja();
    if (aba === 'historico') carregarHistoricoAdmin();
}

function abrirPainelAdmin() { 
    renderizarTabelaAdmin(produtosCache); 
    mudarAbaAdmin('produtos'); 
    document.getElementById('modalAdmin').classList.remove('hidden'); 
}

function fecharPainelAdmin() { 
    document.getElementById('modalAdmin').classList.add('hidden'); 
}

function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    if(!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b">
            <td class="p-2 text-xs">${p.codigo || '-'}</td>
            <td class="p-2 font-medium">${p.nome}</td>
            <td class="p-2">R$ ${Number(p.preco).toFixed(2)}</td>
            <td class="p-2">${p.estoque}</td>
            <td class="p-2 text-center">
                <button onclick="abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque})" class="text-blue-500 mr-2"><i class="fa-solid fa-pen"></i></button>
                <button onclick="excluirProdutoAdmin(${p.id})" class="text-rose-500"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
}

function filtrarTabelaAdmin(t) { 
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(t.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(t.toLowerCase())))); 
}

function abrirModalNovoProdutoAdmin() {
    document.getElementById('formProdId').value = ''; 
    document.getElementById('formNome').value = '';
    document.getElementById('formCodigo').value = ''; 
    document.getElementById('formPreco').value = '';
    document.getElementById('formEstoque').value = '';
    document.getElementById('modalFormProduto').classList.remove('hidden');
}

function abrirEditarProdutoAdmin(id, nome, cod, preco, est) {
    document.getElementById('formProdId').value = id; 
    document.getElementById('formNome').value = nome;
    document.getElementById('formCodigo').value = cod; 
    document.getElementById('formPreco').value = preco;
    document.getElementById('formEstoque').value = est; 
    document.getElementById('modalFormProduto').classList.remove('hidden');
}

function fecharFormProduto() { 
    document.getElementById('modalFormProduto').classList.add('hidden'); 
}

async function salvarProdutoAdmin() {
    const id = document.getElementById('formProdId').value;
    const p = { 
        nome: document.getElementById('formNome').value, 
        codigo: document.getElementById('formCodigo').value, 
        preco: parseFloat(document.getElementById('formPreco').value) || 0, 
        estoque: parseInt(document.getElementById('formEstoque').value) || 0 
    };
    
    if (id) { 
        await supabaseClient.from('produtos').update(p).eq('id', id); 
    } else { 
        await supabaseClient.from('produtos').insert([{ ...p, empresa_id: empresaAtualId }]); 
    }
    
    fecharFormProduto(); 
    await carregarProdutosCache(); 
    renderizarTabelaAdmin(produtosCache);
}

async function excluirProdutoAdmin(id) { 
    if (confirm('Excluir este item permanentemente?')) { 
        await supabaseClient.from('produtos').delete().eq('id', id); 
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
    } 
}

async function carregarOperadoresLoja() {
    const { data } = await supabaseClient.from('usuarios_empresas').select('*').eq('empresa_id', empresaAtualId);
    let html = '';
    if (data) {
        data.forEach(op => {
            html += `<tr class="border-b">
                <td class="p-3 text-xs">${op.user_id}</td>
                <td class="p-3">${op.cargo}</td>
                <td class="p-3 text-center"><span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">ATIVO</span></td>
                <td class="p-3 font-bold text-emerald-600">Disponível no Faturamento</td>
                <td class="p-3 text-center"><button onclick="excluirOperadorLoja('${op.user_id}')" class="text-rose-600"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        });
    }
    const tabelaOps = document.getElementById('tabelaOperadoresLoja');
    if(tabelaOps) tabelaOps.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum operador indexado.</td></tr>';
}

async function excluirOperadorLoja(id) { 
    if (confirm('Remover operador da equipe?')) { 
        await supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        carregarOperadoresLoja(); 
    } 
}

function abrirModalNovoOperador() { 
    document.getElementById('modalNovoOperador').classList.remove('hidden'); 
}

function fecharModalNovoOperador() { 
    document.getElementById('modalNovoOperador').classList.add('hidden'); 
}

async function salvarNovoOperador() {
    const email = document.getElementById('novoOpEmail').value.trim();
    const password = document.getElementById('novoOpSenha').value.trim();
    if (!email || !password) { alert('Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if(error) { alert('Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        carregarOperadoresLoja();
    }
}

async function carregarHistoricoAdmin() {
    const { data } = await supabaseClient.from('vendas').select('*').eq('empresa_id', empresaAtualId).order('created_at', { ascending: false });
    historicoVendasCache = data || []; 
    renderizarHistoricoVendas();
}

function renderizarHistoricoVendas() {
    let html = '';
    historicoVendasCache.forEach(v => {
        const nomesItens = v.itens ? v.itens.map(i => i.nome).join(', ') : '';
        html += `<tr class="border-b text-xs">
            <td class="p-3">${new Date(v.created_at).toLocaleString()}</td>
            <td class="p-3 font-semibold">${v.operador}</td>
            <td class="p-3 truncate max-w-xs">${nomesItens}</td>
            <td class="p-3 text-right font-bold">R$ ${v.valor_total.toFixed(2)}</td>
        </tr>`;
    });
    const tabelaHist = document.getElementById('tabelaHistoricoVendas');
    if(tabelaHist) tabelaHist.innerHTML = html || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma venda registrada nos últimos dias.</td></tr>';
}

// ==========================================
// 6. LEITURA POR CÂMERA (HTML5-QRCODE)
// ==========================================
async function abrirLeitorCamera() {
    origemLeitor = 'busca';
    document.getElementById('modalCamera').classList.remove('hidden');
    await iniciarCameraComHtml5Qrcode();
}

async function escanearCameraAdmin() {
    origemLeitor = 'admin';
    document.getElementById('modalCamera').classList.remove('hidden');
    await iniciarCameraComHtml5Qrcode();
}

async function iniciarCameraComHtml5Qrcode() {
    try {
        if (html5QrcodeInstance) {
            await html5QrcodeInstance.stop().catch(() => {});
            html5QrcodeInstance = null;
        }
        
        html5QrcodeInstance = new Html5Qrcode("videoPreviewCamera");
        const config = {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };
        
        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                fecharLeitorCamera();
                if (origemLeitor === 'busca') {
                    const p = produtosCache.find(prod => prod.codigo === decodedText);
                    if (p) { 
                        adicionarItemVenda(p); 
                    } else { 
                        alert(`Código mapeado (${decodedText}) mas não cadastrado no estoque.`); 
                    }
                } else if (origemLeitor === 'admin') {
                    const inputCodigo = document.getElementById('formCodigo');
                    if(inputCodigo) inputCodigo.value = decodedText;
                }
            },
            () => {}
        );
    } catch (err) {
        console.error("Erro no módulo HTML5 QR Code:", err);
        alert("Câmera indisponível no momento. Certifique-se de dar permissões de vídeo no navegador.");
        fecharLeitorCamera();
    }
}

async function fecharLeitorCamera() {
    if (html5QrcodeInstance) {
        try {
            await html5QrcodeInstance.stop();
        } catch(e) {
            console.error("Erro ao parar câmera:", e);
        }
        html5QrcodeInstance = null;
    }
    const modalCamera = document.getElementById('modalCamera');
    if(modalCamera) modalCamera.classList.add('hidden');
}

// ==========================================
// 7. EXPOSIÇÃO GLOBAL DE FUNÇÕES
// ==========================================
window.instalarPwaApp = instalarPwaApp; 
window.fecharTelaSuperAdmin = fecharTelaSuperAdmin;
window.logarSuperAdmin = logarSuperAdmin; 
window.abrirSuperAdminMaster = abrirSuperAdminMaster;
window.fecharSuperAdminMaster = fecharSuperAdminMaster; 
window.carregarListaClientesSuperAdmin = carregarListaClientesSuperAdmin;
window.filtrarClientesSuperAdmin = filtrarClientesSuperAdmin; 
window.alternarStatusEmpresa = alternarStatusEmpresa;
window.alternarTelaAuth = alternarTelaAuth; 
window.tratarEnterLogin = tratarEnterLogin;
window.processarAutenticacao = processarAutenticacao; 
window.realizarLogout = realizarLogout;
window.gerenciarCaixaModal = gerenciarCaixaModal; 
window.fecharModalCaixa = fecharModalCaixa;
window.confirmarAcaoCaixa = confirmarAcaoCaixa; 
window.aoDigitarBusca = aoDigitarBusca;
window.tratarEnterBuscaCaixa = tratarEnterBuscaCaixa; 
window.focarBusca = focarBusca;
window.alterarQtd = alterarQtd; 
window.solicitarRemocaoItem = solicitarRemocaoItem;
window.abrirModalCancelarItem = abrirModalCancelarItem; 
window.fecharModalCancelarItem = fecharModalCancelarItem;
window.fecharModalAutorizacao = fecharModalAutorizacao; 
window.confirmarAutorizacaoPin = confirmarAutorizacaoPin;
window.cancelarVenda = cancelarVenda; 
window.finalizarVenda = finalizarVenda;
window.mudarAbaAdmin = mudarAbaAdmin; 
window.abrirPainelAdmin = abrirPainelAdmin;
window.fecharPainelAdmin = fecharPainelAdmin; 
window.excluirOperadorLoja = excluirOperadorLoja;
window.abrirModalNovoOperador = abrirModalNovoOperador; 
window.fecharModalNovoOperador = fecharModalNovoOperador;
window.salvarNovoOperador = salvarNovoOperador; 
window.filtrarTabelaAdmin = filtrarTabelaAdmin;
window.abrirModalNovoProdutoAdmin = abrirModalNovoProdutoAdmin; 
window.abrirEditarProdutoAdmin = abrirEditarProdutoAdmin;
window.fecharFormProduto = fecharFormProduto; 
window.salvarProdutoAdmin = salvarProdutoAdmin;
window.excluirProdutoAdmin = excluirProdutoAdmin; 
window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin; 
window.fecharLeitorCamera = fecharLeitorCamera;
window.salvarPinAdmin = salvarPinAdmin;
window.adicionarItemVendaPorObjeto = adicionarItemVendaPorObjeto;