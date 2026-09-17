// ==========================================
// MÓDULO DE INTERFACE, BOTÕES E AÇÕES (PDV-VS)
// ==========================================

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
    
    if (email === 'vancely@admin.com' && senha === 'vancely2026') {
        fecharTelaSuperAdmin(); 
        await abrirSuperAdminMaster();
    } else {
        if (fb) {
            fb.innerText = 'Credenciais inválidas.'; 
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
    if (!tbody) return;
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
    
    const fb = document.getElementById('feedbackAuth');
    if (fb) fb.classList.add('hidden');

    if (modo === 'login') {
        if (fields.titulo) fields.titulo.innerText = 'PDV-VS Enterprise'; 
        if (fields.btn) fields.btn.innerText = 'Acessar Sistema';
        if (fields.icone) fields.icone.className = 'fa-solid fa-cash-register text-4xl text-emerald-600 mb-2';
        if (fields.divSenha) fields.divSenha.classList.remove('hidden'); 
        if (fields.links) fields.links.classList.remove('hidden');
        if (fields.voltar) fields.voltar.classList.add('hidden'); 
        if (fields.perfil) fields.perfil.classList.add('hidden');
        if (fields.mercado) fields.mercado.classList.add('hidden'); 
        if (fields.doc) fields.doc.classList.add('hidden');
    } else if (modo === 'cadastro') {
        if (fields.titulo) fields.titulo.innerText = 'Novo Estabelecimento'; 
        if (fields.btn) fields.btn.innerText = 'Criar Conta';
        if (fields.icone) fields.icone.className = 'fa-solid fa-store text-4xl text-blue-600 mb-2';
        if (fields.voltar) fields.voltar.classList.remove('hidden'); 
        if (fields.perfil) fields.perfil.classList.remove('hidden');
        if (fields.mercado) fields.mercado.classList.remove('hidden'); 
        if (fields.doc) fields.doc.classList.remove('hidden');
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
    
    if (!email) { mostrarFeedback('Por favor, informe o e-mail.', 'rose'); return; }

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

            const nomeMercado = nomeMercadoEl ? nomeMercadoEl.value.trim() : '';
            const documento = documentoEl ? documentoEl.value.trim() : '';
            const tipoPerfil = selectPerfilEl ? selectPerfilEl.value : 'operador';

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
        if (infoLogado) infoLogado.innerHTML = `<i class="fa-solid fa-user text-emerald-400 mr-1"></i> ${usuarioNomeExibicao} (${cargoUser === 'admin_mercado' ? 'Admin' : 'Caixa'})`;
    }
    
    if (dadosEmpresaAtual) {
        const tituloEmpresa = document.getElementById('tituloAppEmpresa');
        const badgeEmpresa = document.getElementById('badgeEmpresaLogada');
        if (tituloEmpresa) tituloEmpresa.innerText = dadosEmpresaAtual.nome_mercado;
        if (badgeEmpresa) badgeEmpresa.innerText = `CNPJ: ${dadosEmpresaAtual.documento}`;
    }
    
    const btnAdminMenu = document.getElementById('btnAdminMenu');
    if (btnAdminMenu) btnAdminMenu.classList.toggle('hidden', cargoUser !== 'admin_mercado');
    
    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    if (telaLogin) telaLogin.classList.add('hidden');
    if (appPrincipal) appPrincipal.classList.remove('hidden');
    
    carregarProdutosCache(); 
    focarBusca();
}

async function realizarLogout() { 
    await supabaseClient.auth.signOut(); 
    location.reload(); 
}

function focarBusca() { 
    const input = document.getElementById('inputBusca');
    if (input) input.focus(); 
}

function gerenciarCaixaModal(tipo) {
    acaoCaixaAtual = tipo;
    const modal = document.getElementById('modalCaixa');
    const tituloModal = document.getElementById('tituloModalCaixa');
    const resumoFechamento = document.getElementById('resumoFechamentoCaixa');
    const valFatOp = document.getElementById('valFaturamentoOperador');

    if (tituloModal) tituloModal.innerText = tipo === 'abrir' ? 'Abertura de Caixa' : 'Fechamento de Caixa';
    if (resumoFechamento) resumoFechamento.classList.toggle('hidden', tipo === 'abrir');
    if (tipo === 'fechar' && valFatOp) valFatOp.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
    if (modal) modal.classList.remove('hidden');
}

function fecharModalCaixa() { 
    const modal = document.getElementById('modalCaixa');
    if (modal) modal.classList.add('hidden'); 
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
        if (txtFat) txtFat.innerText = 'R$ 0,00'; 
    }
    fecharModalCaixa();
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
        html += `<div onclick="adicionarItemVendaPorObjeto('${prodString}')" class="p-3 hover:bg-slate-50 cursor-pointer border-b flex justify-between text-sm"> <div><span class="font-semibold text-slate-800">${p.nome}</span><span class="text-xs text-slate-400 block">Cód: ${p.codigo || 'N/A'} ${p.unidade === 'KG' ? '<span class="text-amber-600 font-bold">(Por Peso)</span>' : ''}</span></div> <b>R$ ${Number(p.preco).toFixed(2)} ${p.unidade === 'KG' ? '/kg' : ''}</b> </div>`;
    });
    painel.innerHTML = html || '<div class="p-3 text-xs text-slate-400">Nenhum produto encontrado.</div>';
    painel.classList.remove('hidden');
}

function adicionarItemVendaPorObjeto(prodStr) {
    try {
        const p = JSON.parse(prodStr.replace(/&quot;/g, '"'));
        tratarAdicaoProduto(p);
    } catch(err) {
        console.error("Erro ao parsear item:", err);
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
                    <input type="number" step="0.001" id="inputPesoKg" placeholder="Ex: 0.750" oninput="calcularValorParcialPeso(this.value)" class="w-full p-3 border rounded-lg text-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
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
        alert('Informe um peso válido em KG.');
        return;
    }
    if (produtoEmPesagemAtual) {
        adicionarItemVendaDireto(produtoEmPesagemAtual, peso, true);
        fecharModalPesagemManual();
    }
}

function adicionarItemVendaDireto(produto, qtd, isPeso = false) {
    const existente = itensVenda.find(i => i.id === produto.id && !isPeso); 
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
            else alert('Produto não encontrado!');
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
            <td class="p-2">${item.nome} ${item.isPeso ? '<span class="text-[10px] text-amber-600 block">Pesado manualmente</span>' : ''}</td>
            <td class="p-2">${qtdDisplay}</td>
            <td class="p-2">R$ ${Number(item.preco).toFixed(2)}${item.isPeso ? '/kg' : ''}</td>
            <td class="p-2 font-bold">R$ ${subtotalItem.toFixed(2)}</td>
            <td class="p-2 text-center"><button onclick="solicitarRemocaoItem(${i})" class="text-rose-500"><i class="fa-solid fa-trash"></i></button></td>
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
    if (!pin) { alert('Informe um PIN válido.'); return; }
    localStorage.setItem('pdv_admin_pin_' + empresaAtualId, pin); 
    alert('PIN salvo com sucesso!');
}

function solicitarRemocaoItem(i) {
    indiceItemParaRemover = i; 
    const inputPinAuth = document.getElementById('inputPinAutorizacion');
    const modalAuth = document.getElementById('modalAutorizacaoAdmin');
    if (inputPinAuth) inputPinAuth.value = '';
    if (modalAuth) modalAuth.classList.remove('hidden');
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
    } else { 
        alert('PIN gerencial incorreto!'); 
    }
}

function fecharModalAutorizacao() { 
    const modal = document.getElementById('modalAutorizacaoAdmin');
    if (modal) modal.classList.add('hidden'); 
}

function abrirModalCancelarItem() {
    if (itensVenda.length === 0) { alert('Não há itens na venda.'); return; }
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
    
    if (error) {
        alert('Erro ao registrar venda: ' + error.message);
        return;
    }

    faturamentoDia += total; 
    const txtFat = document.getElementById('txtFaturamentoDia');
    if (txtFat) txtFat.innerText = `R$ ${faturamentoDia.toFixed(2)}`;
    
    itensVenda = []; 
    atualizarTabelaVenda(); 
    alert('Venda concluída e salva com sucesso!');
    focarBusca();
}

function mudarAbaAdmin(aba) {
    ['Produtos', 'Operadores', 'Historico'].forEach(a => {
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
}

function abrirPainelAdmin() { 
    renderizarTabelaAdmin(produtosCache); 
    mudarAbaAdmin('produtos'); 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) modalAdmin.classList.add('flex');
    if (modalAdmin) modalAdmin.classList.remove('hidden'); 
}

function fecharPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) modalAdmin.classList.add('hidden'); 
    if (modalAdmin) modalAdmin.classList.remove('flex');
}

function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    if (!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b">
            <td class="p-2 text-xs">${p.codigo || '-'}</td>
            <td class="p-2 font-medium">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-600 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-2">R$ ${Number(p.preco).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-2">${p.estoque}</td>
            <td class="p-2 text-center">
                <button onclick="abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque}, '${p.unidade || 'UN'}')" class="text-blue-500 mr-2"><i class="fa-solid fa-pen"></i></button>
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
        estoque: estoque ? parseInt(estoque.value) || 0 : 0,
        unidade: unidadeProd
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
            const statusCaixaBadge = caixaAberto 
                ? '<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">ABERTO</span>' 
                : '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">FECHADO</span>';

            html += `<tr class="border-b">
                <td class="p-3 text-xs">${op.user_id}</td>
                <td class="p-3">${op.cargo}</td>
                <td class="p-3 text-center">${statusCaixaBadge}</td>
                <td class="p-3 font-bold text-emerald-600">Disponível no Faturamento</td>
                <td class="p-3 text-center"><button onclick="excluirOperadorLoja('${op.user_id}')" class="text-rose-600"><i class="fa-solid fa-trash"></i></button></td>
            </tr>`;
        });
    }
    const tabelaOps = document.getElementById('tabelaOperadoresLoja');
    if (tabelaOps) tabelaOps.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum operador indexado.</td></tr>';
}

async function excluirOperadorLoja(id) { 
    if (confirm('Remover operador da equipe?')) { 
        await supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        carregarOperadoresLoja(); 
    } 
}

function abrirModalNovoOperador() { 
    const modal = document.getElementById('modalNovoOperador');
    if (modal) modal.classList.remove('hidden'); 
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

    if (!email || !password) { alert('Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { alert('Erro ao criar usuário: ' + error.message); return; }
    
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
        const nomesItens = v.itens ? v.itens.map(i => i.isPeso ? `${i.nome} (${i.qtd.toFixed(3)}kg)` : `${i.nome} (x${i.qtd})`).join(', ') : '';
        html += `<tr class="border-b text-xs">
            <td class="p-3">${new Date(v.created_at).toLocaleString()}</td>
            <td class="p-3 font-semibold">${v.operador}</td>
            <td class="p-3 truncate max-w-xs">${nomesItens}</td>
            <td class="p-3 text-right font-bold">R$ ${v.valor_total.toFixed(2)}</td>
        </tr>`;
    });
    const tabelaHist = document.getElementById('tabelaHistoricoVendas');
    if (tabelaHist) tabelaHist.innerHTML = html || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma venda registrada nos últimos dias.</td></tr>';
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
    if (modalCam) modalCam.classList.remove('hidden');
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
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0
        };
        
        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                fecharLeitorCamera();
                if (origemLeitor === 'busca') {
                    const p = produtosCache.find(prod => (prod.codigo && prod.codigo === decodedText) || prod.nome.toLowerCase().includes(decodedText.toLowerCase()));
                    if (p) { 
                        tratarAdicaoProduto(p); 
                    } else { 
                        alert(`Código/QR lido (${decodedText}), mas produto não encontrado no estoque.`); 
                    }
                } else if (origemLeitor === 'admin') {
                    const inputCodigo = document.getElementById('formCodigo');
                    if (inputCodigo) inputCodigo.value = decodedText;
                }
            },
            () => {}
        );
    } catch (err) {
        console.error("Erro ao iniciar câmera:", err);
        alert("Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador.");
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
    if (modalCamera) modalCamera.classList.add('hidden');
}