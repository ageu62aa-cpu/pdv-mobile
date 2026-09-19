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

export function alternarTelaAuth(modo) {
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
    } else if (modo === 'admin') {
        if (fields.titulo) fields.titulo.innerText = 'Super Admin Master'; 
        if (fields.subtitulo) fields.subtitulo.innerText = 'Acesso Restrito ao Desenvolvedor';
        if (fields.btn) fields.btn.innerText = 'Entrar como Super Admin';
        if (fields.icone) fields.icone.className = 'fa-solid fa-shield-halved text-4xl text-purple-600 mb-2';
        if (fields.divSenha) fields.divSenha.classList.remove('hidden'); 
        if (fields.links) fields.links.classList.add('hidden');
        if (fields.voltar) fields.voltar.classList.remove('hidden'); 
        if (fields.perfil) fields.perfil.classList.add('hidden');
        if (fields.mercado) fields.mercado.classList.add('hidden'); 
        if (fields.doc) fields.doc.classList.add('hidden');
        if (fields.endereco) fields.endereco.classList.add('hidden');
    }
}

export function tratarEnterLogin(e) { 
    if (e.key === 'Enter') { e.preventDefault(); processarAutenticacao(); } 
}

export async function processarAutenticacao() {
    const emailEl = document.getElementById('authEmail');
    const senhaEl = document.getElementById('authSenha');
    const email = emailEl ? emailEl.value.trim() : '';
    const senha = senhaEl ? senhaEl.value.trim() : '';
    
    if (!email) { mostrarFeedback('PDV-VS: Por favor, informe o e-mail.', 'rose'); return; }

    try {
        if (modoTelaAuth === 'admin') {
            if (email === 'vancely@admin.com' && senha === '123456') {
                await abrirSuperAdminMaster();
            } else {
                mostrarFeedback('PDV-VS: Credenciais de Super Admin inválidas.', 'rose');
            }
            return;
        }

        if (modoTelaAuth === 'login') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;
            setUsuarioAtual(data.user); 
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
                ativo: true,
                caixa_aberto: false
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

export async function solicitarRecuperacaoSenha() {
    const emailEl = document.getElementById('authEmail');
    const email = emailEl ? emailEl.value.trim() : '';
    if (!email) {
        mostrarFeedback('PDV-VS: Digite seu e-mail no campo acima para recuperar a senha.', 'amber');
        if (emailEl) emailEl.focus();
        return;
    }
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href,
        });
        if (error) throw error;
        mostrarFeedback('PDV-VS: E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.', 'emerald');
    } catch (e) {
        mostrarFeedback('PDV-VS: Erro ao solicitar recuperação: ' + e.message, 'rose');
    }
}

export async function validarVinculoEmpresaUsuario() {
    try {
        const { data: vincData, error: vincError } = await supabaseClient.from('usuarios_empresas').select('empresa_id, cargo').eq('user_id', usuarioAtual.id).single();
        if (vincError || !vincData) throw new Error('Vínculo comercial não encontrado.');
        
        setEmpresaAtualId(vincData.empresa_id); 
        setCargoUsuarioAtual(vincData.cargo);
        
        const { data: empData } = await supabaseClient.from('empresas').select('*').eq('id', empresaAtualId).single();
        if (empData.ativo === false) {
            await supabaseClient.auth.signOut(); 
            alert('PDV-VS - ACESSO SUSPENSO: Este estabelecimento encontra-se bloqueado por pendência financeira.'); 
            location.reload(); 
            return;
        }
        setDadosEmpresaAtual(empData); 

        setCaixaAberto(empData.caixa_aberto === true);

        const novoTokenSessao = 'sessao_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        setTokenSessaoAtual(novoTokenSessao);

        await supabaseClient.from('sessoes_ativas').upsert({
            user_id: usuarioAtual.id,
            token_sessao: novoTokenSessao,
            updated_at: new Date()
        });

        concluirLoginSucesso(cargoUsuarioAtual);
    } catch (e) { 
        await supabaseClient.auth.signOut(); 
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

export function concluirLoginSucesso(cargoUser) {
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

    atualizarBadgesCaixaInterface();

    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    if (telaLogin) telaLogin.classList.add('hidden');
    if (appPrincipal) appPrincipal.classList.remove('hidden');
    
    carregarProdutosCache(); 
    iniciarSincronizacaoRealtime();
    iniciarMonitoramentoSessaoUnica();
    focarBusca();
}

function iniciarMonitoramentoSessaoUnica() {
    setInterval(async () => {
        if (!usuarioAtual || !tokenSessaoAtual) return;
        try {
            const { data, error } = await supabaseClient
                .from('sessoes_ativas')
                .select('token_sessao')
                .eq('user_id', usuarioAtual.id)
                .single();

            if (error || !data || data.token_sessao !== tokenSessaoAtual) {
                alert('PDV-VS: Sua conta foi acessada em outro dispositivo. Esta sessão foi encerrada.');
                await supabaseClient.auth.signOut();
                location.reload();
            }
        } catch (err) {
            console.error('Erro ao verificar sessão única:', err);
        }
    }, 10000);
}

export function iniciarSincronizacaoRealtime() {
    if (!empresaAtualId) return;

    supabaseClient
        .channel('public:produtos_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${empresaAtualId}` }, async () => {
            console.log('PDV-VS: Mudança de estoque detectada em outro dispositivo!');
            await carregarProdutosCache();
            if (typeof window.renderizarTabelaAdmin === 'function') {
                window.renderizarTabelaAdmin(window.produtosCache);
            }
            atualizarTabelaVenda();
        })
        .subscribe();

    supabaseClient
        .channel('public:empresas_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'empresas', filter: `id=eq.${empresaAtualId}` }, payload => {
            if (payload.new) {
                if (payload.new.ativo === false) {
                    alert('PDV-VS: Este estabelecimento foi bloqueado.');
                    location.reload();
                    return;
                }
                if (payload.new.caixa_aberto !== undefined) {
                    setCaixaAberto(payload.new.caixa_aberto);
                    atualizarBadgesCaixaInterface();
                }
            }
        })
        .subscribe();
}

export async function abrirSuperAdminMaster() {
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.remove('hidden');
    await carregarListaClientesSuperAdmin();
}

export function fecharSuperAdminMaster() { 
    const modal = document.getElementById('modalSuperAdminMaster');
    if (modal) modal.classList.add('hidden'); 
    alternarTelaAuth('login');
}

export async function carregarListaClientesSuperAdmin() {
    const tbody = document.getElementById('tabelaClientesSuperAdmin');
    if (!tbody) return;
    try {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Buscando estabelecimentos...</td></tr>';
        const { data, error } = await supabaseClient.from('empresas').select('*').order('created_at', { ascending: false });
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

export async function alternarStatusEmpresa(empresaId, statusAtual) {
    if (!confirm(`PDV-VS: Deseja realmente alterar o status comercial deste estabelecimento?`)) return;
    const { error } = await supabaseClient.from('empresas').update({ ativo: !statusAtual }).eq('id', empresaId);
    if (!error) { 
        alert('PDV-VS: Status atualizado com sucesso!'); 
        await carregarListaClientesSuperAdmin(); 
    } else {
        alert('PDV-VS: Erro ao atualizar status: ' + error.message);
    }
}

window.alternarTelaAuth = alternarTelaAuth;
window.tratarEnterLogin = tratarEnterLogin;
window.processarAutenticacao = processarAutenticacao;
window.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;
window.abrirSuperAdminMaster = abrirSuperAdminMaster;
window.fecharSuperAdminMaster = fecharSuperAdminMaster;
window.alternarStatusEmpresa = alternarStatusEmpresa;
window.instalarPwaApp = instalarPwaApp;