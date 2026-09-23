// ==========================================
// MÓDULO DE AUTENTICAÇÃO E ADMIN MASTER (PDV-VS)
// ==========================================

import { 
    VERSAO_SISTEMA, deferredPrompt, modoTelaAuth, usuarioAtual, empresaAtualId, 
    cargoUsuarioAtual, dadosEmpresaAtual, caixaAberto, tokenSessaoAtual,
    setDeferredPrompt, setModoTelaAuth, setUsuarioAtual, setEmpresaAtualId, 
    setCargoUsuarioAtual, setDadosEmpresaAtual, setCaixaAberto, setTokenSessaoAtual,
    setListaEmpresasCache, listaEmpresasCache 
} from './state.js';
import { carregarProdutosCache } from './produtos.js';
import { atualizarBadgesCaixaInterface, focarBusca, atualizarTabelaVenda } from './caixa.js';
import { carregarHistoricoAdmin, carregarOperadoresLoja } from './admin.js';

let intervaloMonitoramentoSessao = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    const btnInstalar = document.getElementById('btnInstalarPwa');
    if (btnInstalar) btnInstalar.classList.remove('hidden');
});

export async function instalarPwaApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            const btnInstalar = document.getElementById('btnInstalarPwa');
            if (btnInstalar) btnInstalar.classList.add('hidden');
        }
        setDeferredPrompt(null);
    } else {
        alert('PDV-VS: Instale diretamente pelas configurações ou menu do seu navegador.');
    }
}

let contadorCliquesRodape = 0;
let tempoUltimoCliqueRodape = 0;

export function tentarAcessoSuperAdminMasterSecreto() {
    const agora = Date.now();
    if (agora - tempoUltimoCliqueRodape > 1200) {
        contadorCliquesRodape = 1;
    } else {
        contadorCliquesRodape++;
    }
    tempoUltimoCliqueRodape = agora;

    if (contadorCliquesRodape >= 5) {
        contadorCliquesRodape = 0;
        const senhaMestre = prompt('PDV-VS: Digite a Senha Mestre do Desenvolvedor:');
        
        if (senhaMestre === 'vancely2026@master') {
            abrirSuperAdminMaster();
        } else if (senhaMestre !== null) {
            alert('PDV-VS: Senha mestre incorreta.');
        }
    }
}

function destacarErroCampo(idElemento, mensagem) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;

    elemento.style.borderColor = '#ef4444';
    elemento.classList.add('border-red-500');

    let spanErro = document.getElementById(`erro-${idElemento}`);
    if (!spanErro) {
        spanErro = document.createElement('span');
        spanErro.id = `erro-${idElemento}`;
        spanErro.style.cssText = "color: #ef4444; font-size: 11px; margin-top: 2px; display: block; font-weight: 500;";
        if (elemento.parentNode) {
            elemento.parentNode.appendChild(spanErro);
        }
    }
    spanErro.textContent = mensagem;
}

function limparErrosCampos() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.classList.remove('border-red-500');
        const spanErro = document.getElementById(`erro-${input.id}`);
        if (spanErro) spanErro.remove();
    });
}

// --- FUNÇÃO DE REFRESH LOCAL DA TELA DE AUTH (MANTÉM O UTILIZADOR NO MESMO LUGAR) ---
export function atualizarEstadoTelaAuthLocal() {
    limparErrosCampos();
    
    const inputsAuth = document.querySelectorAll('#telaLogin input');
    inputsAuth.forEach(input => {
        if (input.id !== 'authCep') input.value = '';
    });

    const fb = document.getElementById('feedbackAuth');
    if (fb) fb.classList.add('hidden');

    console.log("🟢 [PDV-VS] Estado da tela de autenticação atualizado localmente.");
}

export function alternarTelaAuth(modo) {
    limparErrosCampos();
    setModoTelaAuth(modo);
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
        if (fields.voltar) fields.voltar.classList.remove('hidden'); 
        if (fields.perfil) fields.perfil.classList.add('hidden'); 
        if (fields.mercado) fields.mercado.classList.remove('hidden'); 
        if (fields.doc) fields.doc.classList.remove('hidden');
        if (fields.endereco) fields.endereco.classList.remove('hidden');
        if (fields.links) fields.links.classList.add('hidden');
    }
}

export function tratarEnterLogin(e) { 
    if (e.key === 'Enter') { e.preventDefault(); processarAutenticacao(); } 
}

export async function processarAutenticacao() {
    limparErrosCampos();
    const emailEl = document.getElementById('authEmail');
    const senhaEl = document.getElementById('authSenha');
    const email = emailEl ? emailEl.value.trim() : '';
    const senha = senhaEl ? senhaEl.value.trim() : '';
    
    if (!email) { 
        destacarErroCampo('authEmail', 'Informe o e-mail de acesso.');
        mostrarFeedback('PDV-VS: Por favor, informe o e-mail.', 'rose'); 
        return; 
    }

    try {
        if (modoTelaAuth === 'login') {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;
            setUsuarioAtual(data.user); 
            await validarVinculoEmpresaUsuario();
        } else if (modoTelaAuth === 'cadastro') {
            const nomeMercadoEl = document.getElementById('authNomeMercado');
            const documentoEl = document.getElementById('authDocumento');
            const cepEl = document.getElementById('authCep');
            const enderecoEl = document.getElementById('authEndereco');
            const numeroEl = document.getElementById('authNumeroImovel');
            const whatsappEl = document.getElementById('authWhatsapp');

            const nomeMercado = nomeMercadoEl ? nomeMercadoEl.value.trim() : '';
            const documento = documentoEl ? documentoEl.value.trim() : '';
            const tipoPerfil = 'admin_mercado'; 
            const cep = cepEl ? cepEl.value.trim() : '';
            const endereco = enderecoEl ? enderecoEl.value.trim() : '';
            const numero = numeroEl ? numeroEl.value.trim() : '';
            const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';

            let temErro = false;
            if (!nomeMercado) { destacarErroCampo('authNomeMercado', 'Informe o nome da loja'); temErro = true; }
            if (!documento) { destacarErroCampo('authDocumento', 'Informe o CPF ou CNPJ'); temErro = true; }
            if (!whatsapp) { destacarErroCampo('authWhatsapp', 'Informe o WhatsApp'); temErro = true; }
            if (!senha) { destacarErroCampo('authSenha', 'Informe uma senha'); temErro = true; }

            if (temErro) {
                mostrarFeedback('PDV-VS: Preencha os campos destacados.', 'rose');
                return;
            }

            const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({ 
                email, 
                password: senha, 
                options: { data: { perfil: tipoPerfil } } 
            });
            if (authError) throw authError;

            const prefixoResponsavel = email.split('@')[0];
            const { data: empData, error: empError } = await window.supabaseClient.from('empresas').insert([{ 
                nome_mercado: nomeMercado, 
                responsavel: prefixoResponsavel, 
                documento, 
                email_admin: email, 
                cep,
                endereco: `${endereco}, nº ${numero}`,
                whatsapp,
                ativo: true,
                caixa_aberto: false
            }]).select().single();
            
            if (empError) throw empError;

            await window.supabaseClient.from('usuarios_empresas').insert([{ 
                user_id: authData.user.id, 
                empresa_id: empData.id, 
                cargo: tipoPerfil 
            }]);
            
            alert('PDV-VS: Estabelecimento cadastrado com sucesso! Faça o login para iniciar.'); 
            alternarTelaAuth('login');
        }
    } catch (e) { 
        const msgErro = e.message ? e.message.toLowerCase() : '';
        if (msgErro.includes('invalid login credentials') || msgErro.includes('invalid') || msgErro.includes('credentials')) {
            destacarErroCampo('authEmail', 'Verifique o e-mail');
            destacarErroCampo('authSenha', 'Senha incorreta');
        } else if (msgErro.includes('password') || msgErro.includes('senha')) {
            destacarErroCampo('authSenha', 'Senha muito fraca (mín. 6 caracteres)');
        } else if (msgErro.includes('email') || msgErro.includes('already registered')) {
            destacarErroCampo('authEmail', 'E-mail inválido ou já cadastrado');
        }
        mostrarFeedback('PDV-VS: ' + e.message, 'rose'); 
    }
}

export async function solicitarRecuperacaoSenha() {
    limparErrosCampos();
    const emailEl = document.getElementById('authEmail');
    const email = emailEl ? emailEl.value.trim() : '';
    if (!email) {
        destacarErroCampo('authEmail', 'Digite o e-mail para recuperar');
        mostrarFeedback('PDV-VS: Digite seu e-mail no campo acima para recuperar a senha.', 'amber');
        if (emailEl) emailEl.focus();
        return;
    }
    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href,
        });
        if (error) throw error;
        mostrarFeedback('PDV-VS: E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.', 'emerald');
    } catch (e) {
        destacarErroCampo('authEmail', 'Erro ao enviar recuperação');
        mostrarFeedback('PDV-VS: Erro ao solicitar recuperação: ' + e.message, 'rose');
    }
}

export async function validarVinculoEmpresaUsuario() {
    try {
        const { data: vincData, error: vincError } = await window.supabaseClient
            .from('usuarios_empresas')
            .select('empresa_id, cargo')
            .eq('user_id', usuarioAtual.id)
            .single();
            
        if (vincError || !vincData) {
            throw new Error('Vínculo comercial não encontrado.');
        }
        
        setEmpresaAtualId(vincData.empresa_id); 
        setCargoUsuarioAtual(vincData.cargo);
        
        const { data: empData } = await window.supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', vincData.empresa_id)
            .single();
            
        if (empData && empData.ativo === false) {
            await window.supabaseClient.auth.signOut(); 
            alert('PDV-VS - ACESSO SUSPENSO: Este estabelecimento encontra-se bloqueado por pendência financeira.'); 
            
            const appPrincipal = document.getElementById('appPrincipal');
            const telaLogin = document.getElementById('telaLogin');
            if (appPrincipal) appPrincipal.classList.add('hidden');
            if (telaLogin) telaLogin.classList.remove('hidden');
            return;
        }
        if (empData) {
            setDadosEmpresaAtual(empData); 
            setCaixaAberto(empData.caixa_aberto === true);
        }

        const novoTokenSessao = 'sessao_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        setTokenSessaoAtual(novoTokenSessao);

        try {
            await window.supabaseClient.from('sessoes_ativas').upsert({
                user_id: usuarioAtual.id,
                token_sessao: novoTokenSessao,
                updated_at: new Date()
            });
        } catch (errSession) {
            console.warn('Aviso de sessão:', errSession);
        }

        concluirLoginSucesso(vincData.cargo);
    } catch (e) { 
        await window.supabaseClient.auth.signOut(); 
        mostrarFeedback('PDV-VS: ' + e.message, 'rose'); 
    }
}

export function mostrarFeedback(msg, cor) {
    const fb = document.getElementById('feedbackAuth'); 
    if (fb) {
        fb.innerText = msg;
        fb.className = `text-xs text-center text-${cor}-600 font-semibold mt-2`; 
        fb.classList.remove('hidden');
    }
}

export async function concluirLoginSucesso(cargoUser) {
    try {
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
            if (badgeLoja) badgeLoja.innerText = `${dadosEmpresaAtual.nome_mercado} (Loja #${dadosEmpresaAtual.id.substring(0,6)})`;
        }
        
        const headerTopo = document.getElementById('headerTopoApp') || document.querySelector('header');
        if (headerTopo) {
            let containerMascote = document.getElementById('containerMascoteRefresh');
            if (!containerMascote) {
                containerMascote = document.createElement('div');
                containerMascote.id = 'containerMascoteRefresh';
                containerMascote.className = 'flex items-center gap-2 cursor-pointer select-none';
                containerMascote.title = 'Atualizar / Sincronizar dados locais e itens novos';
                
                // Botão de refresh local na barra superior do PDV (força resgate de produtos, itens novos e cache)
                containerMascote.onclick = async () => {
                    try {
                        console.log("🔄 [PDV-VS] Atualização local e resgate de novos itens acionados no PDV.");
                        await carregarProdutosCache();
                        if (typeof window.renderizarTabelaAdmin === 'function' && window.produtosCache) {
                            window.renderizarTabelaAdmin(window.produtosCache);
                        }
                        if (typeof atualizarTabelaVenda === 'function') atualizarTabelaVenda();
                        if (typeof atualizarBadgesCaixaInterface === 'function') atualizarBadgesCaixaInterface();
                        if (typeof focarBusca === 'function') focarBusca();
                    } catch (errSync) {
                        console.warn('Erro ao atualizar dados locais:', errSync);
                    }
                };
                
                headerTopo.prepend(containerMascote);
            }
            
            const nomeLojaTexto = dadosEmpresaAtual ? dadosEmpresaAtual.nome_mercado : 'PDV-VS';
            containerMascote.innerHTML = `
                <img src="assets/mascote.jpeg" alt="Mascote PDV" class="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 shadow-md hover:scale-105 transition-transform">
                <span class="font-bold text-sm tracking-tight text-slate-800">${nomeLojaTexto}</span>
            `;
        }
        
        const btnAdminMenu = document.getElementById('btnAdminMenu');
        if (btnAdminMenu) {
            if (cargoUser === 'admin_mercado') {
                btnAdminMenu.classList.remove('hidden');
            } else {
                btnAdminMenu.classList.add('hidden');
            }
        }

        atualizarBadgesCaixaInterface();
    } catch (errUI) {
        console.warn('Aviso na interface de login:', errUI);
    }

    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    if (telaLogin) telaLogin.classList.add('hidden');
    if (appPrincipal) appPrincipal.classList.remove('hidden');
    
    try {
        carregarProdutosCache(); 
        iniciarSincronizacaoRealtime();
        iniciarMonitoramentoSessaoUnica();
        focarBusca();
    } catch (errInit) {
        console.warn('Aviso de inicialização em segundo plano:', errInit);
    }
}

function iniciarMonitoramentoSessaoUnica() {
    if (intervaloMonitoramentoSessao) clearInterval(intervaloMonitoramentoSessao);
    
    intervaloMonitoramentoSessao = setInterval(async () => {
        if (!usuarioAtual || !tokenSessaoAtual) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('sessoes_ativas')
                .select('token_sessao')
                .eq('user_id', usuarioAtual.id)
                .single();

            if (error || !data || data.token_sessao !== tokenSessaoAtual) {
                clearInterval(intervaloMonitoramentoSessao);
                alert('PDV-VS: Sua conta foi acessada em outro dispositivo. Esta sessão foi encerrada.');
                await window.supabaseClient.auth.signOut();
                
                const appPrincipal = document.getElementById('appPrincipal');
                const telaLogin = document.getElementById('telaLogin');
                if (appPrincipal) appPrincipal.classList.add('hidden');
                if (telaLogin) telaLogin.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Erro ao verificar sessão única:', err);
        }
    }, 10000);
}

export function iniciarSincronizacaoRealtime() {
    if (!empresaAtualId) return;

    try {
        window.supabaseClient
            .channel('public:produtos_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${empresaAtualId}` }, async () => {
                await carregarProdutosCache();
                if (typeof window.renderizarTabelaAdmin === 'function') {
                    window.renderizarTabelaAdmin(window.produtosCache);
                }
                atualizarTabelaVenda();
            })
            .subscribe();

        window.supabaseClient
            .channel('public:empresas_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'empresas', filter: `id=eq.${empresaAtualId}` }, payload => {
                if (payload.new) {
                    if (payload.new.ativo === false) {
                        alert('PDV-VS: Este estabelecimento foi bloqueado.');
                        const appPrincipal = document.getElementById('appPrincipal');
                        const telaLogin = document.getElementById('telaLogin');
                        if (appPrincipal) appPrincipal.classList.add('hidden');
                        if (telaLogin) telaLogin.classList.remove('hidden');
                        return;
                    }
                    if (payload.new.caixa_aberto !== undefined) {
                        setCaixaAberto(payload.new.caixa_aberto);
                        atualizarBadgesCaixaInterface();
                    }
                }
            })
            .subscribe();
    } catch (errRt) {
        console.warn('Aviso de realtime:', errRt);
    }
}

export async function abrirSuperAdminMaster() {
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.remove('hidden');
    await carregarListaClientesSuperAdmin();
}

export function fecharSuperAdminMaster() { 
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.add('hidden'); 
}

export async function carregarListaClientesSuperAdmin() {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Buscando estabelecimentos...</td></tr>';
        const { data, error } = await window.supabaseClient.from('empresas').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        setListaEmpresasCache(data || []);
        renderizarTabelaSuperAdmin(listaEmpresasCache);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-rose-500">PDV-VS: Erro ao carregar dados.</td></tr>';
    }
}

export function renderizarTabelaSuperAdmin(lista) {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!tbody) return;
    if (!lista || lista.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum estabelecimento cadastrado.</td></tr>'; 
        return; 
    }
    
    let html = '';
    lista.forEach(emp => {
        html += `<tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold">${emp.nome_mercado}</td>
            <td class="p-3">${emp.responsavel || '-'}</td>
            <td class="p-3 text-xs">${emp.documento} <br><span class="text-slate-400">${emp.whatsapp || ''}</span></td>
            <td class="p-3 text-xs">${emp.email_admin}</td>
            <td class="p-3 text-center">
                <button onclick="window.alternarStatusEmpresa('${emp.id}', ${emp.ativo})" class="${emp.ativo ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-3 py-1 rounded text-xs font-semibold shadow transition">
                    ${emp.ativo ? 'Bloquear' : 'Ativar'}
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

export async function adicionarNovoClienteSuperAdmin() {
    const nome = prompt('Nome do Novo Estabelecimento / Loja:');
    if (!nome) return;
    const documento = prompt('CNPJ ou CPF do Estabelecimento:');
    if (!documento) return;
    const email = prompt('E-mail de Acesso Admin:');
    if (!email) return;
    const senha = prompt('Senha inicial para o Admin:');
    if (!senha) return;
    const whatsapp = prompt('WhatsApp de contato:') || '';

    try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email,
            password: senha,
            options: { data: { perfil: 'admin_mercado' } }
        });
        if (authError) throw authError;

        const prefixo = email.split('@')[0];
        const { data: empData, error: empError } = await window.supabaseClient.from('empresas').insert([{
            nome_mercado: nome,
            responsavel: prefixo,
            documento,
            email_admin: email,
            whatsapp,
            ativo: true,
            caixa_aberto: false
        }]).select().single();

        if (empError) throw empError;

        await window.supabaseClient.from('usuarios_empresas').insert([{
            user_id: authData.user.id,
            empresa_id: empData.id,
            cargo: 'admin_mercado'
        }]);

        alert('PDV-VS: Estabelecimento adicionado com sucesso!');
        await carregarListaClientesSuperAdmin();
    } catch (e) {
        alert('PDV-VS: Erro ao cadastrar cliente: ' + e.message);
    }
}

export async function alternarStatusEmpresa(empresaId, statusAtual) {
    if (!confirm(`PDV-VS: Deseja realmente alterar o status comercial deste estabelecimento?`)) return;
    const { error } = await window.supabaseClient.from('empresas').update({ ativo: !statusAtual }).eq('id', empresaId);
    if (!error) { 
        alert('PDV-VS: Status atualizado com sucesso!'); 
        await carregarListaClientesSuperAdmin(); 
    } else {
        alert('PDV-VS: Erro ao atualizar status: ' + error.message);
    }
}

// ==========================================
// EXPOSIÇÃO GLOBAL PARA COMPATIBILIDADE HTML
// ==========================================
window.alternarTelaAuth = alternarTelaAuth;
window.atualizarEstadoTelaAuthLocal = atualizarEstadoTelaAuthLocal;
window.tratarEnterLogin = tratarEnterLogin;
window.processarAutenticacao = processarAutenticacao;
window.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;
window.abrirSuperAdminMaster = abrirSuperAdminMaster;
window.fecharSuperAdminMaster = fecharSuperAdminMaster;
window.adicionarNovoClienteSuperAdmin = adicionarNovoClienteSuperAdmin;
window.alternarStatusEmpresa = alternarStatusEmpresa;
window.instalarPwaApp = instalarPwaApp;
window.tentarAcessoSuperAdminMasterSecreto = tentarAcessoSuperAdminMasterSecreto;