// ==========================================
// PDV-VS Enterprise - Módulo Principal (main.js)
// Arquivo Limpo: Apenas Inicialização, Auth e Integração de Módulos
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
import { setUsuarioAtual, setEmpresaAtualId, setCargoUsuarioAtual, setCaixaAberto } from './state.js';

// Importando funções essenciais do seu módulo de caixa
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
    alterarQtd
} from './caixa.js';

const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';

window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("🟢 [SUPABASE] Conectado com sucesso!");

// --- EXPOSIÇÃO GLOBAL DE FUNÇÕES DO CAIXA (Para o HTML e eventos inline) ---
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

document.addEventListener("DOMContentLoaded", () => {
    verificarSessaoEAlternarTelas();
    inicializarAtalhosTeclado();
});

// --- CONTROLE DE SESSÃO E TELAS DO SISTEMA ---
async function verificarSessaoEAlternarTelas() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    const telaLogin = document.getElementById('telaLogin');
    const appPrincipal = document.getElementById('appPrincipal');
    const infoUsuario = document.getElementById('infoUsuarioLogado');

    if (session && session.user) {
        setUsuarioAtual(session.user);
        setEmpresaAtualId(session.user.id); // Ajuste conforme a lógica da sua tabela de empresas/perfis

        if (telaLogin) telaLogin.classList.add('hidden');
        if (appPrincipal) appPrincipal.classList.remove('hidden');
        if (infoUsuario) infoUsuario.innerText = session.user.email;
        
        // Verifica cargo do operador no Supabase para restrições
        const { data: opData } = await window.supabaseClient
            .from('operadores')
            .select('cargo')
            .eq('email', session.user.email)
            .maybeSingle();

        const cargo = opData ? opData.cargo : 'admin_mercado';
        setCargoUsuarioAtual(cargo);

        const btnAdmin = document.getElementById('btnAdminMenu');
        if (btnAdmin) {
            if (cargo === 'admin_mercado') {
                btnAdmin.classList.remove('hidden');
            } else {
                btnAdmin.classList.add('hidden');
            }
        }

        // Executa checagens do módulo de caixa
        await verificarStatusCaixaServidor();
        focarBusca();
    } else {
        if (telaLogin) telaLogin.classList.remove('hidden');
        if (appPrincipal) appPrincipal.classList.add('hidden');
    }
}

// --- AUTENTICAÇÃO ---
window.tratarEnterLogin = function(e) { if (e.key === 'Enter') processarAutenticacao(); }

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
}

// --- ATALHOS GLOBAIS DE TECLADO ---
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
        }
    });
}