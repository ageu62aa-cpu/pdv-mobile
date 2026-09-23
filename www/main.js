// ==========================================
// PDV-VS Enterprise - Módulo Principal (main.js Otimizado)
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { setUsuarioAtual, setEmpresaAtualId, setCargoUsuarioAtual } from './state.js';
import { abrirLeitorCamera, escanearCameraAdmin, fecharLeitorCamera } from './camera.js';
import { 
    processarAutenticacao, 
    solicitarRecuperacaoSenha, 
    tratarEnterLogin, 
    alternarTelaAuth, 
    instalarPwaApp,
    tentarAcessoSuperAdminMasterSecreto,
    fecharSuperAdminMaster,
    carregarListaClientesSuperAdmin
} from './auth.js';

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
        const inputBairro = document.getElementById('authBairro');
        const inputCidade = document.getElementById('authCidade');
        const inputUf = document.getElementById('authUf');
        const inputNumero = document.getElementById('authNumeroImovel');

        if (inputEndereco) inputEndereco.value = data.logradouro || '';
        if (inputBairro) inputBairro.value = data.bairro || '';
        if (inputCidade) inputCidade.value = data.localidade || '';
        if (inputUf) inputUf.value = data.uf || '';
        if (inputNumero) inputNumero.focus();
    } catch (error) {
        console.error("Erro ao consultar o CEP:", error);
    }
};

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

// --- CONTROLE DO SUPER ADMIN MASTER ---
window.tentarAcessoSuperAdminMasterSeguro = tentarAcessoSuperAdminMasterSecreto;
window.fecharSuperAdminMaster = fecharSuperAdminMaster;
window.carregarListaClientesSuperAdmin = carregarListaClientesSuperAdmin;

// --- AUTH ---
window.alternarTelaAuth = alternarTelaAuth;
window.instalarAppPwa = instalarPwaApp;
window.tratarEnterLogin = tratarEnterLogin;
window.processarAutenticacao = processarAutenticacao;
window.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;

document.addEventListener("DOMContentLoaded", () => {
    verificarSessaoEAlternarTelas();
    inicializarAtalhosTeclado();
});

// --- VERIFICAÇÃO DE SESSÃO E INICIALIZAÇÃO ---
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
                    .select('nome_mercado, documento, ativo')
                    .eq('id', empresaIdFinal)
                    .maybeSingle();

                if (!errEmpresa && dadosEmpresa) {
                    if (dadosEmpresa.ativo === false) {
                        alert("PDV-VS - ACESSO SUSPENSO: Este estabelecimento encontra-se bloqueado.");
                        await window.supabaseClient.auth.signOut();
                        if (telaLogin) telaLogin.classList.remove('hidden');
                        if (appPrincipal) appPrincipal.classList.add('hidden');
                        return;
                    }
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
            fecharSuperAdminMaster();
        }
    });
}