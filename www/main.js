// ==========================================
// PDV-VS Enterprise - Módulo Principal (main.js Corrigido)
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

// --- EXPOSIÇÃO GLOBAL DE FUNÇÕES ---
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

// --- CONTROLE DE ADMIN / CLIQUES ---
let clickCountAdmin = 0;
let clickTimerAdmin = null;

window.tratarCliqueCaixaOuAdmin = function() {
    clickCountAdmin++;
    clearTimeout(clickTimerAdmin);
    clickTimerAdmin = setTimeout(() => {
        if (clickCountAdmin >= 5) {
            const secaoAdmin = document.getElementById('secaoAdminSecreta') || document.getElementById('painelAdmin');
            if (secaoAdmin) secaoAdmin.classList.toggle('hidden');
            else alert("Modo administrativo secreto ativado.");
        } else {
            window.location.reload();
        }
        clickCountAdmin = 0;
    }, 1000);
};
window.registrarCliqueSecretoAdmin = window.tratarCliqueCaixaOuAdmin;

// --- CORREÇÃO DA TELA DE AUTH (LOGIN / CADASTRO) ---
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
    if (e.key === 'Enter') processarAutenticacao(); 
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
});

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
        console.error("Erro na verificação de sessão:", err);
    }
}

function inicializarAtalhosTeclado() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            gerenciarCaixaModal('abrir');
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
        }
    });
}