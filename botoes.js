// ==========================================
// MÓDULO DE INTERFACE, BOTÕES E AÇÕES (PDV-VS) - v1.0.0
// ==========================================

const VERSAO_SISTEMA = "v1.0.0";

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
        alert('PDV-VS: Instale diretamente pelas configurações ou menu do seu navegador.');
    }
}

function fecharTelaSuperAdmin() { 
    const tela = document.getElementById('telaLoginSuperAdmin');
    if (tela) tela.classList.add('hidden'); 
}

async function logarSuperAdmin() {
    const emailEl = document.getElementById('superAdminEmail');
    const senhaEl = document.getElementById('superAdminSenha');
    const fb = document.getElementById('feedbackSuperAdmin');
    
    if (fb) fb.classList.add('hidden');
    
    const email = emailEl ? emailEl.value.trim() : '';
    const senha = senhaEl ? senhaEl.value.trim() : '';
    
    if (email === 'vancely@admin.com' && senha === '123456') {
        fecharTelaSuperAdmin(); 
        await abrirSuperAdminMaster();
    } else {
        if (fb) {
            fb.innerText = 'PDV-VS: Credenciais inválidas. Verifique o e-mail e senha de Super Admin.'; 
            fb.classList.remove('hidden');
        }
    }
}

async function abrirSuperAdminMaster() {
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.remove('hidden');
    await carregarListaClientesSuperAdmin();
}

function fecharSuperAdminMaster() { 
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.add('hidden'); 
}

async function carregarListaClientesSuperAdmin() {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Buscando estabelecimentos...</td></tr>';
        const { data, error } = await supabaseClient.from('empresas').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        window.listaEmpresasCache = data || [];
        renderizarTabelaSuperAdmin(window.listaEmpresasCache);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-rose-500">PDV-VS: Erro ao carregar dados.</td></tr>';
    }
}

function renderizarTabelaSuperAdmin(lista) {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!tbody) return;
    if (!lista || lista.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum estabelecimento cadastrado.</td></tr>'; 
        return; 
    }
    
    let html = '';
    lista.forEach(emp => {
        const statusBadge = emp.ativo 
            ? '<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">ATIVO</span>' 
            : '<span class="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">BLOQUEADO</span>';
        
        html += `<tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${emp.nome_mercado}</td>
            <td class="p-3">${emp.responsavel || '-'}</td>
            <td class="p-3 text-xs">${emp.documento} <br><span class="text-slate-400">${emp.whatsapp || ''}</span></td>
            <td class="p-3 text-xs">${emp.email_admin}</td>
            <td class="p-3 text-center">
                <button onclick="alternarStatusEmpresa('${emp.id}', ${emp.ativo})" class="${emp.ativo ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-3 py-1 rounded text-xs font-semibold shadow transition">
                    ${emp.ativo ? 'Bloquear' : 'Ativar'}
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

async function alternarStatusEmpresa(empresaId, statusAtual) {
    if (!confirm(`PDV-VS: Deseja realmente alterar o status comercial deste estabelecimento?`)) return;
    const { error } = await supabaseClient.from('empresas').update({ ativo: !statusAtual }).eq('id', empresaId);
    if (!error) { 
        alert('PDV-VS: Status atualizado com sucesso!'); 
        await carregarListaClientesSuperAdmin(); 
    } else {
        alert('PDV-VS: Erro ao atualizar status: ' + error.message);
    }
}

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
        doc: document.getElementById('divDocumentoCadastro'),
        endereco: document.getElementById('divCamposEnderecoCadastro')
    };
    
    const fb = document.getElementById('feedbackAuth');
    if (fb) fb.classList.add('hidden');

    if (modo === 'login') {
        if (fields.titulo) fields.titulo.innerText = 'PDV-VS Enterprise'; 
        if (fields.subtitulo) fields.subtitulo.innerText = `Versão ${VERSAO_SISTEMA}`;
        if (fields.btn) fields.btn.innerText = 'Acessar Sistema';
        if (fields.icone) fields.icone.className = 'fa-solid fa-cash-register text-4xl text-emerald-600 mb-2';
        if (fields.divSenha) fields.divSenha.classList.remove('hidden'); 
        if (fields.links) fields.links.classList.remove('hidden');
        if (fields.voltar) fields.voltar.classList.add('hidden'); 
        if (fields.perfil) fields.perfil.classList.add('hidden');
        if (fields.mercado) fields.mercado.classList.add('hidden'); 
        if (fields.doc) fields.doc.classList.add('hidden');
        if (fields.endereco) fields.endereco.classList.add('hidden');
    } else if (modo === 'cadastro') {
        if (fields.titulo) fields.titulo.innerText = 'Novo Estabelecimento'; 
        if (fields.subtitulo) fields.subtitulo.innerText = 'Cadastre sua loja (Plano Comum)';
        if (fields.btn) fields.btn.innerText = 'Criar Conta';
        if (fields.icone) fields.icone.className = 'fa-solid fa-store text-4xl text-blue-600 mb-2';
        if (fields.voltar) fields.voltar.classList.remove('hidden'); 
        if (fields.perfil) fields.perfil.classList.remove('hidden');
        if (fields.mercado) fields.mercado.classList.remove('hidden'); 
        if (fields.doc) fields.doc.classList.remove('hidden');
        if (fields.endereco) fields.endereco.classList.remove('hidden');
        if (fields.links) fields.links.classList.add('hidden');
    }
}

function tratarEnterLogin(e) { 
    if (e.key === 'Enter') { e.preventDefault(); processarAutenticacao(); } 
}

async function processarAutenticacao() {
    const emailEl = document.getElementById('authEmail');
    const senhaEl = document.getElementById('authSenha');
    const email = emailEl ? emailEl.value.trim() : '';
    const senha = senhaEl ? senhaEl.value.trim() : '';
    
    if (!email) { mostrarFeedback('PDV-VS: Por favor, informe o e-mail.', 'rose'); return; }

    try {
        if (modoTelaAuth === 'login' || modoTelaAuth === 'admin') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;
            usuarioAtual = data.user; 
            await validarVinculoEmpresaUsuario();
        } else if (modoTelaAuth === 'cadastro') {
            const nomeMercadoEl = document.getElementById('authNomeMercado');
            const documentoEl = document.getElementById('authDocumento');
            const selectPerfilEl = document.getElementById('selectTipoPerfil');
            const cepEl = document.getElementById('authCep');
            const enderecoEl = document.getElementById('authEndereco');
            const numeroEl = document.getElementById('authNumeroImovel');
            const whatsappEl = document.getElementById('authWhatsapp');

            const nomeMercado = nomeMercadoEl ? nomeMercadoEl.value.trim() : '';
            const documento = documentoEl ? documentoEl.value.trim() : '';
            const tipoPerfil = selectPerfilEl ? selectPerfilEl.value : 'operador';
            const cep = cepEl ? cepEl.value.trim() : '';
            const endereco = enderecoEl ? enderecoEl.value.trim() : '';
            const numero = numeroEl ? numeroEl.value.trim() : '';
            const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';

            if (!nomeMercado || !documento || !whatsapp) {
                mostrarFeedback('PDV-VS: Preencha o nome do mercado, documento e WhatsApp.', 'rose');
                return;
            }

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
                cep,
                endereco: `${endereco}, nº ${numero}`,
                whatsapp,
                ativo: true 
            }]).select().single();
            
            if (empError) throw empError;

            await supabaseClient.from('usuarios_empresas').insert([{ 
                user_id: authData.user.id, 
                empresa_id: empData.id, 
                cargo: tipoPerfil 
            }]);
            
            alert('PDV-VS: Estabelecimento cadastrado com sucesso! Faça o login para iniciar.'); 
            alternarTelaAuth('login');
        }
    } catch (e) { 
        mostrarFeedback('PDV-VS: ' + e.message, 'rose'); 
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
            alert('PDV-VS - ACESSO SUSPENSO: Este estabelecimento encontra-se bloqueado por pendência financeira.'); 
            location.reload(); 
            return;
        }
        dadosEmpresaAtual = empData; 
        concluirLoginSucesso(cargoUsuarioAtual);
    } catch (e) { 
        await supabaseClient.auth.signOut(); 
        mostrarFeedback('PDV-VS: ' + e.message, 'rose'); 
    }
}

function mostrarFeedback(msg, cor) {
    const fb = document.getElementById('feedbackAuth'); 
    if (fb) {
        fb.innerText = msg;
        fb.className = `text-xs text-center text-${cor}-600 font-semibold mt-2`; 
        fb.classList.remove('hidden');
    }
}

function concluirLoginSucesso(cargoUser) {
    if (usuarioAtual && usuarioAtual.email) {
        const usuarioNomeExibicao = usuarioAtual.email.split('@')[0];
        const infoLogado = document.getElementById('infoUsuarioLogado');
        if (infoLogado) infoLogado.innerHTML = `<i class="fa-solid fa-user text-emerald-300 mr-1"></i> ${usuarioNomeExibicao} (${cargoUser === 'admin_mercado' ? 'Admin' : 'Caixa'})`;
    }
    
    if (dadosEmpresaAtual) {
        const tituloEmpresa = document.getElementById('tituloAppEmpresa');
        const badgeEmpresa = document.getElementById('badgeEmpresaLogada');
        const badgeLoja = document.getElementById('badgeNumeroLoja');
        if (tituloEmpresa) tituloEmpresa.innerText = dadosEmpresaAtual.nome_mercado;
        if (badgeEmpresa) badgeEmpresa.innerText = `CNPJ: ${dadosEmpresaAtual.documento}`;
        if (badgeLoja) badgeLoja.innerText = `Loja #${dadosEmpresaAtual.id.substring(0,6)}`;
    }
    
    const btnAdminMenu = document.getElementById('btnAdminMenu');
    if (btnAdminMenu) btnAdminMenu.classList.toggle('hidden', cargoUser !== 'admin_mercado');
    
    // Status de caixa individual por usuário e empresa
    const statusCaixaSalvo = localStorage.getItem(`pdv_caixa_aberto_${empresaAtualId}_${usuarioAtual.id}`);
    caixaAberto = (statusCaixaSalvo === 'true');

    atualizarBadgesCaixaInterface();

    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    if (telaLogin) telaLogin.classList.add('hidden');
    if (appPrincipal) appPrincipal.classList.remove('hidden');
    
    carregarProdutosCache(); 
    focarBusca();
}

async function atualizarPaginaCompleta() {
    if (confirm('PDV-VS: Deseja atualizar e sincronizar todos os dados do sistema?')) {
        await carregarProdutosCache();
        if (cargoUsuarioAtual === 'admin_mercado') {
            await carregarHistoricoAdmin();
            await carregarOperadoresLoja();
        }
        alert('PDV-VS: Dados sincronizados com sucesso!');
        focarBusca();
    }
}

async function realizarLogout() { 
    if (caixaAberto) {
        alert('PDV-VS: ATENÇÃO! Você não pode sair do sistema com o caixa individual aberto. Faça o fechamento do caixa antes de sair.');
        return;
    }
    if (confirm('PDV-VS: Deseja realmente encerrar a sessão?')) {
        await supabaseClient.auth.signOut(); 
        location.reload(); 
    }
}

function focarBusca() { 
    const input = document.getElementById('inputBusca');
    if (input) input.focus(); 
}

function gerenciarCaixaModal(tipo) {
    acaoCaixaAtual = tipo;
    const modal = document.getElementById('modalCaixa');
    const tituloModal = document.getElementById('tituloModalCaixa');
    const secaoAbrir = document.getElementById('secaoAbrirCaixa');
    const resumoFechamento = document.getElementById('resumoFechamentoCaixa');
    const valFatOp = document.getElementById('valFaturamentoOperador');
    const valTrocoInicial = document.getElementById('valTrocoInicialCaixa');
    const valTotalGeral = document.getElementById('valTotalGeralCaixa');
    const inputValorCaixa = document.getElementById('inputValorCaixa');

    if (tituloModal) tituloModal.innerHTML = tipo === 'abrir' ? '<i class="fa-solid fa-cash-register text-emerald-600"></i> Abertura de Caixa (Individual)' : '<i class="fa-solid fa-cash-register text-amber-600"></i> Fechamento de Caixa (Individual)';
    if (secaoAbrir) secaoAbrir.classList.toggle('hidden', tipo === 'fechar');
    if (resumoFechamento) resumoFechamento.classList.toggle('hidden', tipo === 'abrir');
    
    if (tipo === 'fechar') {
        if (valFatOp) valFatOp.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
        if (valTrocoInicial) valTrocoInicial.innerText = `R$ ${(valorTrocoAbertura || 0).toFixed(2)}`;
        const totalComTroco = faturamentoDia + (valorTrocoAbertura || 0);
        if (valTotalGeral) valTotalGeral.innerText = `R$ ${totalComTroco.toFixed(2)}`;
    } else {
        if (inputValorCaixa) inputValorCaixa.value = '';
    }
    
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => {
        if (tipo === 'abrir' && inputValorCaixa) {
            inputValorCaixa.focus();
        } else {
            const btnConfirmar = document.getElementById('btnConfirmarCaixaModal');
            if (btnConfirmar) btnConfirmar.focus();
        }
    }, 100);
}

let valorTrocoAbertura = 0;
let horaAberturaCaixa = null;

function tratarEnterModalCaixa(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmarAcaoCaixa();
    }
}

function fecharModalCaixa() { 
    const modal = document.getElementById('modalCaixa');
    if (modal) modal.classList.add('hidden'); 
}

function confirmarAcaoCaixa() {
    const inputValorCaixa = document.getElementById('inputValorCaixa');
    const valorDigitado = inputValorCaixa ? parseFloat(inputValorCaixa.value) || 0 : 0;

    if (acaoCaixaAtual === 'abrir') {
        valorTrocoAbertura = valorDigitado;
        horaAberturaCaixa = new Date();
        caixaAberto = true;
        alert('PDV-VS: Caixa aberto com sucesso!');
    } else {
        const horaFechamento = new Date();
        const totalArrecadado = faturamentoDia;
        const totalGeralGaveta = totalArrecadado + (valorTrocoAbertura || 0);
        
        alert(`PDV-VS: Caixa Fechado com Sucesso!\n- Abertura: ${horaAberturaCaixa ? horaAberturaCaixa.toLocaleTimeString() : 'N/A'}\n- Fechamento: ${horaFechamento.toLocaleTimeString()}\n- Troco Inicial: R$ ${(valorTrocoAbertura || 0).toFixed(2)}\n- Vendas (Turno): R$ ${totalArrecadado.toFixed(2)}\n- Total Geral em Gaveta: R$ ${totalGeralGaveta.toFixed(2)}`);
        
        caixaAberto = false;
        valorTrocoAbertura = 0;
        faturamentoDia = 0;
        const txtFat = document.getElementById('txtFaturamentoDia');
        if (txtFat) txtFat.innerText = 'R$ 0,00';
    }
    
    if (usuarioAtual && empresaAtualId) {
        localStorage.setItem(`pdv_caixa_aberto_${empresaAtualId}_${usuarioAtual.id}`, caixaAberto ? 'true' : 'false');
    }

    atualizarBadgesCaixaInterface();
    fecharModalCaixa();
    focarBusca();
}

function atualizarBadgesCaixaInterface() {
    const badges = document.querySelectorAll('.badgeCaixaStatus');
    badges.forEach(b => {
        b.innerText = caixaAberto ? 'ABERTO' : 'FECHADO';
        b.className = caixaAberto 
            ? 'badgeCaixaStatus text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded font-semibold' 
            : 'badgeCaixaStatus text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded font-semibold';
    });
}

async function carregarProdutosCache() {
    if (!empresaAtualId) return;
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
        html += `<div onclick="adicionarItemVendaPorObjeto('${prodString}')" class="p-3 hover:bg-slate-50 cursor-pointer border-b flex justify-between text-sm"> <div><span class="font-semibold text-slate-800">${p.nome}</span><span class="text-xs text-slate-400 block">Cód: ${p.codigo || 'N/A'} | Estoque: ${p.estoque} ${p.unidade === 'KG' ? '<span class="text-amber-600 font-bold">(Por Peso)</span>' : ''}</span></div> <b>R$ ${Number(p.preco).toFixed(2)} ${p.unidade === 'KG' ? '/kg' : ''}</b> </div>`;
    });
    painel.innerHTML = html || '<div class="p-3 text-xs text-slate-400">Nenhum produto encontrado.</div>';
    painel.classList.remove('hidden');
}

function adicionarItemVendaPorObjeto(prodStr) {
    try {
        const p = JSON.parse(prodStr.replace(/&quot;/g, '"'));
        tratarAdicaoProduto(p);
    } catch(err) {
        console.error("PDV-VS Erro ao parsear item:", err);
    }
}

function tratarAdicaoProduto(produto) {
    const painel = document.getElementById('painelSugestoes');
    if (painel) painel.classList.add('hidden');
    
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

function abrirModalPesagemManual(produto) {
    produtoEmPesagemAtual = produto;
    let modal = document.getElementById('modalPesagemManual');
    if (!modal) {
        const divModal = document.createElement('div');
        divModal.id = 'modalPesagemManual';
        divModal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
        divModal.innerHTML = `
            <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-slate-800 animate-scaleUp">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-slate-900"><i class="fa-solid fa-scale-balanced text-emerald-600 mr-2"></i> Produto por Peso</h3>
                    <button onclick="fecharModalPesagemManual()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div class="mb-4 bg-slate-50 p-3 rounded-lg border">
                    <p id="lblNomeProdutoPeso" class="font-bold text-slate-800 text-base"></p>
                    <p id="lblPrecoKgProduto" class="text-xs text-slate-500 mt-1"></p>
                </div>
                <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-600 mb-1">PESO NA BALANÇA (KG)</label>
                    <input type="number" step="0.001" id="inputPesoKg" placeholder="Ex: 0.750" oninput="calcularValorParcialPeso(this.value)" onkeydown="tratarEnterModalPesagem(event)" class="w-full p-3 border rounded-lg text-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                </div>
                <div class="mb-5 bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center">
                    <span class="text-xs font-bold text-emerald-800">VALOR TOTAL:</span>
                    <span id="lblValorCalculadoPeso" class="text-xl font-extrabold text-emerald-700">R$ 0,00</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="fecharModalPesagemManual()" class="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold text-sm">Cancelar</button>
                    <button onclick="confirmarAdicaoPeso()" class="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold text-sm shadow">Adicionar</button>
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

function calcularValorParcialPeso(pesoStr) {
    const peso = parseFloat(pesoStr) || 0;
    const lblValorCalc = document.getElementById('lblValorCalculadoPeso');
    if (produtoEmPesagemAtual && lblValorCalc) {
        const total = peso * produtoEmPesagemAtual.preco;
        lblValorCalc.innerText = `R$ ${total.toFixed(2)}`;
    }
}

function tratarEnterModalPesagem(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmarAdicaoPeso();
    }
}

function fecharModalPesagemManual() {
    const modal = document.getElementById('modalPesagemManual');
    if (modal) modal.classList.add('hidden');
    produtoEmPesagemAtual = null;
    focarBusca();
}

function confirmarAdicaoPeso() {
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

function adicionarItemVendaDireto(produto, qtd, isPeso = false) {
    const existente = itensVenda.find(i => i.id === produto.id && i.isPeso === isPeso); 
    if (existente && !isPeso) { 
        existente.qtd += qtd; 
    } else { 
        itensVenda.push({ 
            ...produto, 
            qtd: qtd, 
            isPeso: isPeso,
            nomeExibicao: isPeso ? `${produto.nome} (${qtd.toFixed(3)} kg)` : produto.nome
        }); 
    }
    atualizarTabelaVenda();
}

function tratarEnterBuscaCaixa(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
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

function atualizarTabelaVenda() {
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
            : `<input type="number" min="1" value="${item.qtd}" onchange="alterarQtd(${i}, this.value)" class="w-14 text-center border rounded">`;

        html += `<tr class="border-b">
            <td class="p-2">${item.nome} ${item.isPeso ? '<span class="text-[10px] text-amber-600 block">Pesado (Baixa por Peso)</span>' : ''}</td>
            <td class="p-2">${qtdDisplay}</td>
            <td class="p-2">R$ ${Number(item.preco).toFixed(2)}${item.isPeso ? '/kg' : ''}</td>
            <td class="p-2 font-bold">R$ ${subtotalItem.toFixed(2)}</td>
            <td class="p-2 text-center"><button onclick="solicitarRemocaoItem(${i})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    if (txtSubtotal) txtSubtotal.innerText = `R$ ${total.toFixed(2)}`;
    if (txtTotal) txtTotal.innerText = `R$ ${total.toFixed(2)}`;
}

function alterarQtd(i, qtd) { 
    const q = parseFloat(qtd); 
    if (q > 0) { itensVenda[i].qtd = q; atualizarTabelaVenda(); } 
}

function salvarPinAdmin() {
    const inputPin = document.getElementById('inputAdminPinConfig');
    const pin = inputPin ? inputPin.value.trim() : '';
    if (!pin || pin.length < 4) { alert('PDV-VS: Informe um PIN válido de pelo menos 4 dígitos.'); return; }
    localStorage.setItem('pdv_admin_pin_' + empresaAtualId, pin); 
    alert('PDV-VS: PIN gerencial atualizado com sucesso!');
}

function solicitarRemocaoItem(i) {
    indiceItemParaRemover = i; 
    const inputPinAuth = document.getElementById('inputPinAutorizacion');
    const modalAuth = document.getElementById('modalAutorizacaoAdmin');
    if (inputPinAuth) inputPinAuth.value = '';
    if (modalAuth) modalAuth.classList.remove('hidden');
    setTimeout(() => {
        if (inputPinAuth) inputPinAuth.focus();
    }, 100);
}

function tratarEnterModalAutorizacao(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmarAutorizacaoPin();
    }
}

function confirmarAutorizacaoPin() {
    const inputPinAuth = document.getElementById('inputPinAutorizacion');
    const pin = inputPinAuth ? inputPinAuth.value.trim() : '';
    const pinSalvo = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    if (pin === pinSalvo) {
        if (indiceItemParaRemover !== null) { 
            itensVenda.splice(indiceItemParaRemover, 1); 
            atualizarTabelaVenda(); 
        }
        fecharModalAutorizacao();
        focarBusca();
    } else { 
        alert('PDV-VS: PIN gerencial incorreto!'); 
        if (inputPinAuth) {
            inputPinAuth.value = '';
            inputPinAuth.focus();
        }
    }
}

function fecharModalAutorizacao() { 
    const modal = document.getElementById('modalAutorizacaoAdmin');
    if (modal) modal.classList.add('hidden'); 
    focarBusca();
}

function abrirModalCancelarItem() {
    if (itensVenda.length === 0) { alert('PDV-VS: Não há itens na venda.'); return; }
    let html = '';
    itensVenda.forEach((item, index) => {
        html += `<div class="p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b" onclick="fecharModalCancelarItem(); solicitarRemocaoItem(${index});"> <div><span class="font-semibold text-slate-800">${item.nome}</span></div> <button class="text-rose-600 text-xs border border-rose-200 rounded px-2 py-1">Remover</button> </div>`;
    });
    const listaCancelar = document.getElementById('listaItensParaCancelar');
    const modalCancelar = document.getElementById('modalCancelarItem');
    if (listaCancelar) listaCancelar.innerHTML = html;
    if (modalCancelar) modalCancelar.classList.remove('hidden');
}

function fecharModalCancelarItem() { 
    const modal = document.getElementById('modalCancelarItem');
    if (modal) modal.classList.add('hidden'); 
    focarBusca();
}

function cancelarVenda() { 
    if (confirm('PDV-VS: Deseja realmente cancelar toda a compra atual?')) { 
        itensVenda = []; 
        atualizarTabelaVenda(); 
    } 
}

async function finalizarVenda() {
    if (!caixaAberto) { alert('PDV-VS: O caixa individual precisa estar aberto! Pressione [F1] ou abra o caixa.'); return; }
    if (itensVenda.length === 0) { alert('PDV-VS: Adicione produtos antes de finalizar.'); return; }
    
    let total = itensVenda.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    
    const { error } = await supabaseClient.from('vendas').insert([{ 
        empresa_id: empresaAtualId, 
        operador: usuarioAtual.email, 
        valor_total: total, 
        itens: itensVenda 
    }]);
    
    if (error) {
        alert('PDV-VS: Erro ao registrar venda: ' + error.message);
        return;
    }

    for (const item of itensVenda) {
        const novoEstoque = Math.max(0, (item.estoque || 0) - item.qtd);
        await supabaseClient.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
    }

    faturamentoDia += total; 
    const txtFat = document.getElementById('txtFaturamentoDia');
    if (txtFat) txtFat.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
    
    itensVenda = []; 
    atualizarTabelaVenda(); 
    await carregarProdutosCache();
    alert('PDV-VS: Venda concluída e estoque atualizado com sucesso!');
    focarBusca();
}

function mudarAbaAdmin(aba) {
    ['Produtos', 'Operadores', 'Historico', 'Configuracoes'].forEach(a => {
        const conteudo = document.getElementById(`conteudoAba${a}`);
        const btn = document.getElementById(`btnAba${a}`);
        if (conteudo) conteudo.classList.add('hidden');
        if (btn) btn.className = 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg';
    });
    
    const activeAba = aba.charAt(0).toUpperCase() + aba.slice(1);
    const conteudoAtivo = document.getElementById(`conteudoAba${activeAba}`);
    const btnAtivo = document.getElementById(`btnAba${activeAba}`);
    
    if (conteudoAtivo) conteudoAtivo.classList.remove('hidden');
    if (btnAtivo) btnAtivo.className = 'px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg';
    
    if (aba === 'operadores') carregarOperadoresLoja();
    if (aba === 'historico') carregarHistoricoAdmin();
    if (aba === 'configuracoes') {
        const inputPinConfig = document.getElementById('inputAdminPinConfig');
        if (inputPinConfig) {
            inputPinConfig.value = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
        }
    }
}

async function recarregarDadosAdmin() {
    await carregarProdutosCache();
    renderizarTabelaAdmin(produtosCache);
    if (cargoUsuarioAtual === 'admin_mercado') {
        await carregarHistoricoAdmin();
        await carregarOperadoresLoja();
    }
    alert('PDV-VS: Dados do painel administrativo atualizados com sucesso!');
}

function abrirPainelAdmin() { 
    renderizarTabelaAdmin(produtosCache); 
    mudarAbaAdmin('produtos'); 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('flex');
        modalAdmin.classList.remove('hidden'); 
    }
}

function fecharPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('hidden'); 
        modalAdmin.classList.remove('flex');
    }
    focarBusca();
}

function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contadorProdutos = document.getElementById('contadorLimiteProdutosAdmin');
    if (contadorProdutos) contadorProdutos.innerText = `${produtosCache.length} / 800 produtos`;
    if (!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b">
            <td class="p-2 text-xs">${p.codigo || '-'}</td>
            <td class="p-2 font-medium">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-600 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-2">R$ ${Number(p.preco).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-2">${p.estoque} ${p.unidade || 'UN'}</td>
            <td class="p-2 text-center">
                <button onclick="abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque}, '${p.unidade || 'UN'}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fa-solid fa-pen"></i></button>
                <button onclick="excluirProdutoAdmin(${p.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
}

function filtrarTabelaAdmin(t) { 
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(t.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(t.toLowerCase())))); 
}

function abrirModalNovoProdutoAdmin() {
    if (produtosCache.length >= 800) {
        alert('PDV-VS - Aviso do Plano Comum: Você atingiu o limite máximo de 800 produtos cadastrados.');
        return;
    }

    const prodId = document.getElementById('formProdId');
    const nome = document.getElementById('formNome');
    const codigo = document.getElementById('formCodigo');
    const preco = document.getElementById('formPreco');
    const estoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');
    const modalForm = document.getElementById('modalFormProduto');

    if (prodId) prodId.value = ''; 
    if (nome) nome.value = '';
    if (codigo) codigo.value = ''; 
    if (preco) preco.value = '';
    if (estoque) estoque.value = '';
    if (selectUnidade) selectUnidade.value = 'UN';

    if (modalForm) modalForm.classList.remove('hidden');
}

function abrirEditarProdutoAdmin(id, nome, cod, preco, est, unidade = 'UN') {
    const prodId = document.getElementById('formProdId');
    const inputNome = document.getElementById('formNome');
    const inputCodigo = document.getElementById('formCodigo');
    const inputPreco = document.getElementById('formPreco');
    const inputEstoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');
    const modalForm = document.getElementById('modalFormProduto');

    if (prodId) prodId.value = id; 
    if (inputNome) inputNome.value = nome;
    if (inputCodigo) inputCodigo.value = cod; 
    if (inputPreco) inputPreco.value = preco;
    if (inputEstoque) inputEstoque.value = est; 
    if (selectUnidade) selectUnidade.value = unidade;

    if (modalForm) modalForm.classList.remove('hidden');
}

function fecharFormProduto() { 
    const modal = document.getElementById('modalFormProduto');
    if (modal) modal.classList.add('hidden'); 
}

async function salvarProdutoAdmin() {
    const prodId = document.getElementById('formProdId');
    const nome = document.getElementById('formNome');
    const codigo = document.getElementById('formCodigo');
    const preco = document.getElementById('formPreco');
    const estoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');

    const id = prodId ? prodId.value : '';
    const unidadeProd = selectUnidade ? selectUnidade.value : 'UN';

    const p = { 
        nome: nome ? nome.value : '', 
        codigo: codigo ? codigo.value : '', 
        preco: preco ? parseFloat(preco.value) || 0 : 0, 
        estoque: estoque ? parseFloat(estoque.value) || 0 : 0,
        unidade: unidadeProd
    };
    
    if (id) { 
        await supabaseClient.from('produtos').update(p).eq('id', id); 
    } else { 
        if (produtosCache.length >= 800) {
            alert('PDV-VS: Limite de 800 produtos do plano comum atingido.');
            return;
        }
        await supabaseClient.from('produtos').insert([{ ...p, empresa_id: empresaAtualId }]); 
    }
    
    fecharFormProduto(); 
    await carregarProdutosCache(); 
    renderizarTabelaAdmin(produtosCache);
}

async function excluirProdutoAdmin(id) { 
    if (confirm('PDV-VS: Deseja excluir este item permanentemente?')) { 
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
            const opCaixaAberto = localStorage.getItem(`pdv_caixa_aberto_${empresaAtualId}_${op.user_id}`) === 'true';
            const statusCaixaBadge = opCaixaAberto 
                ? '<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">ABERTO</span>' 
                : '<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">FECHADO</span>';
            
            const cargoNome = op.cargo === 'admin_mercado' ? 'Administrador' : 'Operador de Caixa';

            html += `<tr class="border-b">
                <td class="p-3 text-xs font-mono">${op.user_id}</td>
                <td class="p-3 font-semibold text-slate-800">${cargoNome}</td>
                <td class="p-3 text-center">${statusCaixaBadge}</td>
                <td class="p-3 text-center">
                    ${op.cargo !== 'admin_mercado' ? `<button onclick="excluirOperadorLoja('${op.user_id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Remover</button>` : '<span class="text-xs text-slate-400">Principal</span>'}
                </td>
            </tr>`;
        });
    }
    const tabelaOps = document.getElementById('tabelaOperadoresLoja');
    if (tabelaOps) tabelaOps.innerHTML = html || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum operador cadastrado.</td></tr>';
}

async function excluirOperadorLoja(id) { 
    if (confirm('PDV-VS: Deseja remover este operador da equipe?')) { 
        await supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        carregarOperadoresLoja(); 
    } 
}

function abrirModalNovoOperador() { 
    supabaseClient.from('usuarios_empresas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtualId).eq('cargo', 'operador').then(({ count }) => {
        if (count >= 1) {
            alert('PDV-VS - Regra do Plano Comum: É permitido apenas 1 operador adicional além do Administrador.');
            return;
        }
        const modal = document.getElementById('modalNovoOperador');
        if (modal) modal.classList.remove('hidden'); 
    });
}

function fecharModalNovoOperador() { 
    const modal = document.getElementById('modalNovoOperador');
    if (modal) modal.classList.add('hidden'); 
}

async function salvarNovoOperador() {
    const inputEmail = document.getElementById('novoOpEmail');
    const inputSenha = document.getElementById('novoOpSenha');
    const email = inputEmail ? inputEmail.value.trim() : '';
    const password = inputSenha ? inputSenha.value.trim() : '';

    if (!email || !password) { alert('PDV-VS: Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { alert('PDV-VS: Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        carregarOperadoresLoja();
        alert('PDV-VS: Operador cadastrado com sucesso!');
    }
}

async function carregarHistoricoAdmin() {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 15);

    const { data } = await supabaseClient.from('vendas')
        .select('*')
        .eq('empresa_id', empresaAtualId)
        .gte('created_at', dataLimite.toISOString())
        .order('created_at', { ascending: false });

    historicoVendasCache = data || []; 
    renderizarHistoricoVendasPorJanelasDiarias();
}

function renderizarHistoricoVendasPorJanelasDiarias() {
    const container = document.getElementById('containerJanelasFaturamentoDiario');
    const lblFatHoje = document.getElementById('adminFatHoje');
    const lblFatSemanal = document.getElementById('adminFatSemanal');
    const lblFatTotal = document.getElementById('adminFatTotal15Dias');

    if (!container) return;

    if (!historicoVendasCache || historicoVendasCache.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400">Nenhuma venda registrada nos últimos 15 dias.</div>';
        if (lblFatHoje) lblFatHoje.innerText = 'R$ 0,00';
        if (lblFatSemanal) lblFatSemanal.innerText = 'R$ 0,00';
        if (lblFatTotal) lblFatTotal.innerText = 'R$ 0,00';
        return;
    }

    let total15Dias = 0;
    let totalHoje = 0;
    let totalSemanal = 0;
    const hojeStr = new Date().toDateString();

    // Agrupar vendas por dia (YYYY-MM-DD)
    const gruposPorDia = {};
    historicoVendasCache.forEach(v => {
        total15Dias += v.valor_total;
        const dataVenda = new Date(v.created_at);
        const diaKey = dataVenda.toISOString().split('T')[0]; // YYYY-MM-DD

        if (dataVenda.toDateString() === hojeStr) {
            totalHoje += v.valor_total;
        }
        if ((new Date() - dataVenda) / (1000 * 60 * 60 * 24) <= 7) {
            totalSemanal += v.valor_total;
        }

        if (!gruposPorDia[diaKey]) {
            gruposPorDia[diaKey] = {
                dataStr: dataVenda.toLocaleDateString('pt-BR'),
                totalDia: 0,
                vendas: []
            };
        }
        gruposPorDia[diaKey].totalDia += v.valor_total;
        gruposPorDia[diaKey].vendas.push(v);
    });

    if (lblFatHoje) lblFatHoje.innerText = `R$ ${totalHoje.toFixed(2)}`;
    if (lblFatSemanal) lblFatSemanal.innerText = `R$ ${totalSemanal.toFixed(2)}`;
    if (lblFatTotal) lblFatTotal.innerText = `R$ ${total15Dias.toFixed(2)}`;

    let htmlJanelas = '';
    Object.keys(gruposPorDia).sort().reverse().forEach((diaKey, idx) => {
        const grupo = gruposPorDia[diaKey];
        const collapseId = `detalheDia_${idx}`;

        let htmlItensVendasDia = '';
        grupo.vendas.forEach(v => {
            const horaVenda = new Date(v.created_at).toLocaleTimeString();
            const itensDesc = v.itens ? v.itens.map(i => i.isPeso ? `${i.nome} (${i.qtd.toFixed(3)}kg)` : `${i.nome} (x${i.qtd})`).join(', ') : 'Itens diversos';
            htmlItensVendasDia += `
                <div class="py-2 px-3 bg-white border-b flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-slate-700">${horaVenda}</span> - <span class="text-slate-600">Op: ${v.operador}</span>
                        <p class="text-[11px] text-slate-500 mt-0.5">${itensDesc}</p>
                    </div>
                    <span class="font-bold text-emerald-700">R$ ${v.valor_total.toFixed(2)}</span>
                </div>
            `;
        });

        htmlJanelas += `
            <div class="bg-slate-50 border-b">
                <div onclick="const el = document.getElementById('${collapseId}'); el.classList.toggle('hidden');" class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition">
                    <div class="flex items-center space-x-2">
                        <i class="fa-solid fa-calendar-day text-emerald-600"></i>
                        <span class="font-bold text-slate-800 text-sm">Data: ${grupo.dataStr}</span>
                        <span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">${grupo.vendas.length} venda(s)</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="font-black text-emerald-700 text-sm">R$ ${grupo.totalDia.toFixed(2)}</span>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="hidden pl-6 pr-3 pb-3 space-y-1 border-t bg-slate-100/60">
                    <div class="py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detalhamento das Vendas do Dia</div>
                    ${htmlItensVendasDia}
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlJanelas;
}

async function abrirLeitorCamera() {
    origemLeitor = 'busca';
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) modalCam.classList.remove('hidden');
    await iniciarCameraComHtml5Qrcode();
}

async function escanearCameraAdmin() {
    origemLeitor = 'admin';
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) {
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');
    }
    await iniciarCameraComHtml5Qrcode();
}

async function iniciarCameraComHtml5Qrcode() {
    try {
        if (html5QrcodeInstance) {
            await html5QrcodeInstance.stop().catch(() => {});
            html5QrcodeInstance = null;
        }
        
        html5QrcodeInstance = new Html5Qrcode("videoPreviewCamera");
        const config = { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.0 };
        
        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                fecharLeitorCamera();
                if (origemLeitor === 'busca') {
                    const p = produtosCache.find(prod => (prod.codigo && prod.codigo.trim() === decodedText.trim()) || prod.nome.toLowerCase().includes(decodedText.toLowerCase()));
                    if (p) { 
                        tratarAdicaoProduto(p); 
                    } else { 
                        alert(`PDV-VS: Código lido (${decodedText}), mas nenhum produto correspondente foi encontrado.`); 
                    }
                } else if (origemLeitor === 'admin') {
                    const inputCodigo = document.getElementById('formCodigo');
                    if (inputCodigo) inputCodigo.value = decodedText;
                }
            },
            () => {}
        );
    } catch (err) {
        console.error("PDV-VS Erro ao iniciar câmera:", err);
        alert("PDV-VS: Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo.");
        fecharLeitorCamera();
    }
}

async function fecharLeitorCamera() {
    if (html5QrcodeInstance) {
        try {
            await html5QrcodeInstance.stop();
        } catch(e) {
            console.error("PDV-VS Erro ao parar câmera:", e);
        }
        html5QrcodeInstance = null;
    }
    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
}