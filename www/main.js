// ==========================================  
// PDV-VS Enterprise - Módulo Principal (main.js)  
// ==========================================  

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'  
import { setUsuarioAtual, setEmpresaAtualId, setCargoUsuarioAtual } from './state.js';  
import { abrirLeitorCamera, escanearCameraAdmin, fecharLeitorCamera } from './camera.js';  

import {   
    verificarStatusCaixaServidor,   
    gerenciarCaixaModal,   
    fecharModalCaixa,   
    confirmarAcaoCaixa,   
    tratarEnterModalCaixa,   
    finalizarVenda,   
    cancelarVenda,   
    abrirModalCancelarItem,   
    fecharModalCancelarItem,   
    solicitarRemocaoItem,   
    tratarEnterModalAutorizacao,   
    confirmarAutorizacaoPin,   
    fecharModalAutorizacao,   
    salvarPinAdmin,   
    realizarLogout,   
    atualizarPaginaCompleta,   
    focarBusca,  
    alterarQtd,  
    aoDigitarBusca,  
    tratarEnterBuscaCaixa  
} from './caixa.js';  

const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';  
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';  

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);  
console.log("🟢 [SUPABASE] Conectado com sucesso!");  

// --- AUTOCOMPLETAR CEP (VIACEP) ---  
window.consultarCep = async function(cep) {  
    const cepLimpo = cep.replace(/\D/g, '');  
    if (cepLimpo.length !== 8) return;  

    try {  
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);  
        const data = await response.json();  

        if (data.erro) {  
            alert("CEP não encontrado.");  
            return;  
        }  

        const inputEndereco = document.getElementById('authEndereco');  
        const inputCidade = document.getElementById('authCidade');  
        const inputUf = document.getElementById('authUf');  
        const inputNumero = document.getElementById('authNumeroImovel');  

        if (inputEndereco) inputEndereco.value = `${data.logradouro || ''}, ${data.bairro || ''}`.trim();  
        if (inputCidade) inputCidade.value = data.localidade || '';  
        if (inputUf) inputUf.value = data.uf || '';  
        if (inputNumero) inputNumero.focus();  
    } catch (error) {  
        console.error("Erro ao consultar o CEP:", error);  
    }  
};  

// --- EXPOSIÇÃO GLOBAL DE FUNÇÕES DO CAIXA E CÂMERA ---  
window.gerenciarCaixaModal = gerenciarCaixaModal;  
window.fecharModalCaixa = fecharModalCaixa;  
window.confirmarAcaoCaixa = confirmarAcaoCaixa;  
window.tratarEnterModalCaixa = tratarEnterModalCaixa;  
window.finalizarVenda = finalizarVenda;  
window.cancelarVenda = cancelarVenda;  
window.abrirModalCancelarItem = abrirModalCancelarItem;  
window.fecharModalCancelarItem = fecharModalCancelarItem;  
window.solicitarRemocaoItem = solicitarRemocaoItem;  
window.tratarEnterModalAutorizacao = tratarEnterModalAutorizacao;  
window.confirmarAutorizacaoPin = confirmarAutorizacaoPin;  
window.fecharModalAutorizacao = fecharModalAutorizacao;  
window.salvarPinAdmin = salvarPinAdmin;  
window.realizarLogout = realizarLogout;  
window.atualizarPaginaCompleta = atualizarPaginaCompleta;  
window.focarBusca = focarBusca;  
window.alterarQtd = alterarQtd;  
window.aoDigitarBusca = aoDigitarBusca;  
window.tratarEnterBuscaCaixa = tratarEnterBuscaCaixa;  

window.abrirLeitorCamera = abrirLeitorCamera;  
window.escanearCameraAdmin = escanearCameraAdmin;  
window.fecharLeitorCamera = fecharLeitorCamera;  

// --- ACIONAMENTO DO SCANNER / CÂMERA NA INTERFACE ---
window.acionarScanner = function() {
    console.log("PDV-VS: Acionando leitor de câmera para Vendas");
    if (typeof abrirLeitorCamera === 'function') {
        abrirLeitorCamera();
    } else {
        alert("Leitor de câmera não carregado.");
    }
};

// --- CONTROLE DO SUPER ADMIN MASTER ---  
window.tentarAcessoSuperAdminMasterSeguro = function() {  
    const modal = document.getElementById('modalSuperAdminMaster');  
    if (modal) {  
        modal.classList.remove('hidden');  
        if (typeof window.carregarListaClientesSuperAdmin === 'function') {  
            window.carregarListaClientesSuperAdmin();  
        }  
    } else {  
        alert("Painel Super Admin Master não encontrado no HTML.");  
    }  
};  

window.fecharSuperAdminMaster = function() {  
    const modal = document.getElementById('modalSuperAdminMaster');  
    if (modal) modal.classList.add('hidden');  
};  

// --- CONTROLE DO PAINEL ADMIN NORMAL (BUSCA INTELIGENTE) ---
window.abrirPainelAdmin = function() {
    console.log("Painel Admin acionado.");
    const modal = document.getElementById('modalAdmin') || 
                  document.getElementById('painelAdmin') || 
                  document.getElementById('modalConfigAdmin') || 
                  document.getElementById('adminModal') ||
                  document.querySelector('[id*="admin"]') ||
                  document.querySelector('[id*="Admin"]');
                  
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof window.carregarHistoricoAdmin === 'function') {
            window.carregarHistoricoAdmin();
        }
    } else {
        alert("Erro: O modal/painel admin não foi localizado na página.");
    }
};

window.fecharPainelAdmin = function() {
    const modal = document.getElementById('modalAdmin') || 
                  document.getElementById('painelAdmin') || 
                  document.getElementById('modalConfigAdmin') || 
                  document.getElementById('adminModal') ||
                  document.querySelector('[id*="admin"]');
    if (modal) modal.classList.add('hidden');
};

// --- TELA DE AUTH / ALTERNÂNCIA ---  
window.alternarTelaAuth = function(tipo) {  
    const tituloAuth = document.getElementById('tituloAuth');  
    const subtituloAuth = document.getElementById('subtituloAuth');  
    const btnAcaoAuth = document.getElementById('btnAcaoAuth');  
    const linksAuxiliares = document.getElementById('linksAuxiliares');  
    const linkVoltarLogin = document.getElementById('linkVoltarLogin');  
      
    const divTipoPerfil = document.getElementById('divTipoPerfil');  
    const divNomeMercadoCadastro = document.getElementById('divNomeMercadoCadastro');  
    const divDocumentoCadastro = document.getElementById('divDocumentoCadastro');  
    const divCamposEnderecoCadastro = document.getElementById('divCamposEnderecoCadastro');  

    if (tipo === 'cadastro') {  
        if (tituloAuth) tituloAuth.innerText = "Criar Estabelecimento";  
        if (subtituloAuth) subtituloAuth.innerText = "Cadastre sua loja para começar a usar";  
        if (btnAcaoAuth) btnAcaoAuth.innerText = "Cadastrar Loja";  
        if (linksAuxiliares) linksAuxiliares.classList.add('hidden');  
        if (linkVoltarLogin) linkVoltarLogin.classList.remove('hidden');  

        if (divTipoPerfil) divTipoPerfil.classList.remove('hidden');  
        if (divNomeMercadoCadastro) divNomeMercadoCadastro.classList.remove('hidden');  
        if (divDocumentoCadastro) divDocumentoCadastro.classList.remove('hidden');  
        if (divCamposEnderecoCadastro) divCamposEnderecoCadastro.classList.remove('hidden');  
    } else if (tipo === 'admin') {  
        if (tituloAuth) tituloAuth.innerText = "Acesso Super Admin";  
        if (subtituloAuth) subtituloAuth.innerText = "Painel de Controle Mestre";  
        if (btnAcaoAuth) btnAcaoAuth.innerText = "Acessar Master";  
        if (linksAuxiliares) linksAuxiliares.classList.add('hidden');  
        if (linkVoltarLogin) linkVoltarLogin.classList.remove('hidden');  

        if (divTipoPerfil) divTipoPerfil.classList.add('hidden');  
        if (divNomeMercadoCadastro) divNomeMercadoCadastro.classList.add('hidden');  
        if (divDocumentoCadastro) divDocumentoCadastro.classList.add('hidden');  
        if (divCamposEnderecoCadastro) divCamposEnderecoCadastro.classList.add('hidden');  
    } else {  
        if (tituloAuth) tituloAuth.innerText = "PDV-VS Enterprise";  
        if (subtituloAuth) subtituloAuth.innerText = "Sistema de Gestão Comercial e PDV";  
        if (btnAcaoAuth) btnAcaoAuth.innerText = "Acessar Sistema";  
        if (linksAuxiliares) linksAuxiliares.classList.remove('hidden');  
        if (linkVoltarLogin) linkVoltarLogin.classList.add('hidden');  

        if (divTipoPerfil) divTipoPerfil.classList.add('hidden');  
        if (divNomeMercadoCadastro) divNomeMercadoCadastro.classList.add('hidden');  
        if (divDocumentoCadastro) divDocumentoCadastro.classList.add('hidden');  
        if (divCamposEnderecoCadastro) divCamposEnderecoCadastro.classList.add('hidden');  
    }  
};  

window.instalarAppPwa = function() {  
    console.log("Instalação PWA acionada.");  
};  

window.tratarEnterLogin = function(e) {   
    if (e.key === 'Enter') window.processarAutenticacao();   
};  

window.processarAutenticacao = async function() {  
    const email = document.getElementById('authEmail')?.value.trim();  
    const senha = document.getElementById('authSenha')?.value.trim();  

    if (!email || !senha) {  
        alert("Preencha o e-mail e a senha.");  
        return;  
    }  

    try {  
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password: senha });  
        if (error) throw error;  
        await verificarSessaoEAlternarTelas();  
    } catch (e) {  
        alert("Erro ao autenticar: " + (e.message || e));  
    }  
};  

window.solicitarRecuperacaoSenha = function() {  
    alert("Para recuperar a senha, contacte o suporte técnico.");  
};  

document.addEventListener("DOMContentLoaded", () => {  
    verificarSessaoEAlternarTelas();  
    inicializarAtalhosTeclado();  

    const ativarRefreshMascote = (idElemento) => {
        const el = document.getElementById(idElemento);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.reload();
            });
        }
    };

    ativarRefreshMascote('iconeAuth');
    ativarRefreshMascote('iconeAppPrincipal');
});  

// --- VERIFICAÇÃO DE SESSÃO ---  
async function verificarSessaoEAlternarTelas() {  
    try {  
        const { data: { session } } = await window.supabaseClient.auth.getSession();  
          
        const telaLogin = document.getElementById('telaLogin');  
        const appPrincipal = document.getElementById('appPrincipal');  
        const infoUsuario = document.getElementById('infoUsuarioLogado');  

        if (session && session.user) {  
            setUsuarioAtual(session.user);  

            const { data: opData } = await window.supabaseClient  
                .from('usuarios_empresas')  
                .select('empresa_id, cargo')  
                .eq('user_id', session.user.id)  
                .maybeSingle();  

            let cargoFinal = 'admin_mercado';  
            let empresaIdFinal = session.user.id;  

            if (opData && opData.empresa_id) {  
                empresaIdFinal = opData.empresa_id;  
                cargoFinal = opData.cargo || 'admin_mercado';  
            }  

            setEmpresaAtualId(empresaIdFinal);  
            setCargoUsuarioAtual(cargoFinal);  

            let nomeLojaExibicao = "Nome do Estabelecimento";  
            let cnpjLojaExibicao = "";  

            if (empresaIdFinal) {  
                const { data: dadosEmpresa, error: errEmpresa } = await window.supabaseClient  
                    .from('empresas')  
                    .select('nome_mercado, documento')  
                    .eq('id', empresaIdFinal)  
                    .maybeSingle();  

                if (!errEmpresa && dadosEmpresa) {  
                    nomeLojaExibicao = dadosEmpresa.nome_mercado || "Nome do Estabelecimento";  
                    cnpjLojaExibicao = dadosEmpresa.documento ? `CNPJ/CPF: ${dadosEmpresa.documento}` : "";  
                }  
            }  

            const elTituloApp = document.getElementById('tituloAppEmpresa');  
            const elBadgeCnpj = document.getElementById('badgeEmpresaLogada');  

            if (elTituloApp) elTituloApp.textContent = nomeLojaExibicao;  
            if (elBadgeCnpj) {  
                if (cnpjLojaExibicao) {  
                    elBadgeCnpj.textContent = cnpjLojaExibicao;  
                    elBadgeCnpj.classList.remove('hidden');  
                } else {  
                    elBadgeCnpj.classList.add('hidden');  
                }  
            }  

            if (telaLogin) telaLogin.classList.add('hidden');  
            if (appPrincipal) appPrincipal.classList.remove('hidden');  
            if (infoUsuario) infoUsuario.innerText = session.user.email;  
              
            const btnAdmin = document.getElementById('btnAdminMenu');  
            if (btnAdmin) {  
                if (cargoFinal === 'admin_mercado') {  
                    btnAdmin.classList.remove('hidden');  
                    btnAdmin.style.display = 'inline-flex';  
                } else {  
                    btnAdmin.classList.add('hidden');  
                    btnAdmin.style.display = 'none';  
                }  
            }  

            await verificarStatusCaixaServidor();  
            focarBusca();  
        } else {  
            if (telaLogin) telaLogin.classList.remove('hidden');  
            if (appPrincipal) appPrincipal.classList.add('hidden');  
        }  
    } catch (err) {  
        console.error("Erro crítico na verificação de sessão:", err);  
    }  
}  

// --- ATALHOS DE TECLADO BLINDADOS ---
function inicializarAtalhosTeclado() {  
    window.addEventListener('keydown', (e) => {  
        if (e.key === 'F1') {  
            e.preventDefault();  
            gerenciarCaixaModal('abrir');  
        } else if (e.key === 'F2') {  
            e.preventDefault();  
            gerenciarCaixaModal('fechar');  
        } else if (e.key === 'F5') {  
            e.preventDefault();  
            focarBusca();  
        } else if (e.key === 'F9') {  
            e.preventDefault();  
            finalizarVenda();  
        } else if (e.key === 'Escape') {  
            fecharModalCaixa();  
            fecharModalAutorizacao();  
            fecharModalCancelarItem();  
            fecharLeitorCamera();  
            fecharSuperAdminMaster();  
            fecharPainelAdmin();  
        }  
    });  
}