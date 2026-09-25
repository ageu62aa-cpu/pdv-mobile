// ==========================================  
// PDV-VS Enterprise - Módulo Principal (main.js)  
// Arquitetura: ES6 Modules / Singleton Supabase
// ==========================================  

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';  
import { state, setUsuarioAtual, setEmpresaAtualId, setCargoUsuarioAtual } from './state.js';  
import { abrirLeitorCamera, escanearCameraAdmin, fecharLeitorCamera } from './camera.js';  

// --- IMPORTAÇÃO DOS MODAIS DINÂMICOS ---
import { abrirModalCheckout, fecharModalFinalizarVenda } from './components/modalCheckout.js';
import { abrirModalProduto, fecharModalProduto } from './components/modalProduto.js';
import { abrirModalSuperAdmin, fecharModalSuperAdmin } from './components/modalSuperAdmin.js';

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

// CONFIGURAÇÃO DO CLIENTE SUPABASE (Centralizada)
const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';  
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';  

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase; // Fallback para módulos legados

// --- SERVIÇO DE CEP (INTEGRAÇÃO VIACEP ENCAPSULADA) ---  
window.consultarCep = async function(cep) {  
    if (!cep) return;
    const cepLimpo = cep.replace(/\D/g, '');  
    if (cepLimpo.length !== 8) return;  

    try {  
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);  
        if (!response.ok) throw new Error("Falha na requisição da API de CEP");
        
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
        console.error("[ViaCEP Error]:", error);  
    }  
};  

// --- EXPOSIÇÃO CONTROLADA AO ESCOPO GLOBAL (COMPATIBILIDADE COM HTML INLINE) ---  
Object.assign(window, {
    // Módulos do Caixa & Câmera
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
    tratarEnterBuscaCaixa,
    abrirLeitorCamera,
    escanearCameraAdmin,
    fecharLeitorCamera,

    // Modais Dinâmicos
    abrirModalCheckout,
    fecharModalFinalizarVenda,
    abrirModalProduto,
    fecharModalProduto,
    abrirModalSuperAdmin,
    fecharModalSuperAdmin
});

// --- SCANNER / CÂMERA ---
window.acionarScanner = function() {
    if (typeof abrirLeitorCamera === 'function') {
        abrirLeitorCamera();
    } else {
        console.error("[Camera Module]: Módulo de leitor de câmera indisponível.");
        alert("O leitor de câmera não pôde ser iniciado.");
    }
};

// --- CONTROLES DE INTERFACE (MODAIS DINÂMICOS E PAINÉIS) ---  
window.tentarAcessoSuperAdminMasterSeguro = function() {  
    abrirModalSuperAdmin();
};  

window.fecharSuperAdminMaster = function() {  
    fecharModalSuperAdmin(); 
};  

window.abrirPainelAdmin = function() {
    const modal = document.getElementById('modalAdmin');
    if (modal) {
        modal.classList.remove('hidden');
        if (typeof window.carregarHistoricoAdmin === 'function') {
            window.carregarHistoricoAdmin();
        }
    } else {
        console.error("[UI Error]: O elemento 'modalAdmin' não foi encontrado no HTML.");
        alert("Erro: O Painel Administrativo não foi encontrado na página.");
    }
};

window.fecharPainelAdmin = function() {
    document.getElementById('modalAdmin')?.classList.add('hidden');
};

// --- AUTENTICAÇÃO E TROCA DE TELAS ---  
window.alternarTelaAuth = function(tipo) {  
    const elementos = {
        tituloAuth: document.getElementById('tituloAuth'),
        subtituloAuth: document.getElementById('subtituloAuth'),
        btnAcaoAuth: document.getElementById('btnAcaoAuth'),
        linksAuxiliares: document.getElementById('linksAuxiliares'),
        linkVoltarLogin: document.getElementById('linkVoltarLogin'),
        divTipoPerfil: document.getElementById('divTipoPerfil'),
        divNomeMercadoCadastro: document.getElementById('divNomeMercadoCadastro'),
        divDocumentoCadastro: document.getElementById('divDocumentoCadastro'),
        divCamposEnderecoCadastro: document.getElementById('divCamposEnderecoCadastro')
    };

    const eCadastro = tipo === 'cadastro';
    const eAdmin = tipo === 'admin';

    if (elementos.tituloAuth) elementos.tituloAuth.innerText = eCadastro ? "Criar Estabelecimento" : (eAdmin ? "Acesso Super Admin" : "PDV-VS Enterprise");
    if (elementos.subtituloAuth) elementos.subtituloAuth.innerText = eCadastro ? "Cadastre sua loja para começar a usar" : (eAdmin ? "Painel de Controle Mestre" : "Sistema de Gestão Comercial e PDV");
    if (elementos.btnAcaoAuth) elementos.btnAcaoAuth.innerText = eCadastro ? "Cadastrar Loja" : (eAdmin ? "Acessar Master" : "Acessar Sistema");

    elementos.linksAuxiliares?.classList.toggle('hidden', eCadastro || eAdmin);
    elementos.linkVoltarLogin?.classList.toggle('hidden', !eCadastro && !eAdmin);

    const exibirCamposExtra = eCadastro;
    elementos.divTipoPerfil?.classList.toggle('hidden', !exibirCamposExtra);
    elementos.divNomeMercadoCadastro?.classList.toggle('hidden', !exibirCamposExtra);
    elementos.divDocumentoCadastro?.classList.toggle('hidden', !exibirCamposExtra);
    elementos.divCamposEnderecoCadastro?.classList.toggle('hidden', !exibirCamposExtra);
};  

window.instalarAppPwa = function() {  
    console.log("[PWA Event]: Solicitação de instalação capturada.");  
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
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });  
        if (error) throw error;  
        await verificarSessaoEAlternarTelas();  
    } catch (e) {  
        alert("Erro ao autenticar: " + (e.message || e));  
    }  
};  

window.solicitarRecuperacaoSenha = function() {  
    alert("Para recuperar a senha, entre em contato com o suporte técnico.");  
};  

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {  
    verificarSessaoEAlternarTelas();  
    inicializarAtalhosTeclado();  

    const vincularRecarregamento = (idElemento) => {
        document.getElementById(idElemento)?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.reload();
        });
    };

    vincularRecarregamento('iconeAuth');
    vincularRecarregamento('iconeAppPrincipal');
});  

// --- SESSÃO E PERMISSÕES DO USUÁRIO ---  
async function verificarSessaoEAlternarTelas() {  
    try {  
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();  
        if (sessionError) throw sessionError;

        const telaLogin = document.getElementById('telaLogin');  
        const appPrincipal = document.getElementById('appPrincipal');  
        const infoUsuario = document.getElementById('infoUsuarioLogado');  

        if (session?.user) {  
            setUsuarioAtual(session.user);  

            // Busca empresa e cargo vinculados
            const { data: opData } = await supabase  
                .from('usuarios_empresas')  
                .select('empresa_id, cargo')  
                .eq('user_id', session.user.id)  
                .maybeSingle();  

            const cargoFinal = opData?.cargo || 'admin_mercado';  
            const empresaIdFinal = opData?.empresa_id || session.user.id;  

            setEmpresaAtualId(empresaIdFinal);  
            setCargoUsuarioAtual(cargoFinal);  

            // Busca metadados da empresa
            let nomeLojaExibicao = "Nome do Estabelecimento";  
            let cnpjLojaExibicao = "";  

            if (empresaIdFinal) {  
                const { data: dadosEmpresa } = await supabase  
                    .from('empresas')  
                    .select('nome_mercado, documento')  
                    .eq('id', empresaIdFinal)  
                    .maybeSingle();  

                if (dadosEmpresa) {  
                    nomeLojaExibicao = dadosEmpresa.nome_mercado || "Nome do Estabelecimento";  
                    cnpjLojaExibicao = dadosEmpresa.documento ? `CNPJ/CPF: ${dadosEmpresa.documento}` : "";  
                }  
            }  

            // Atualização da UI Topo
            const elTituloApp = document.getElementById('tituloAppEmpresa');  
            const elBadgeCnpj = document.getElementById('badgeEmpresaLogada');  

            if (elTituloApp) elTituloApp.textContent = nomeLojaExibicao;  
            if (elBadgeCnpj) {  
                elBadgeCnpj.textContent = cnpjLojaExibicao;  
                elBadgeCnpj.classList.toggle('hidden', !cnpjLojaExibicao);  
            }  

            telaLogin?.classList.add('hidden');  
            appPrincipal?.classList.remove('hidden');  
            if (infoUsuario) infoUsuario.innerText = session.user.email;  
              
            // Controle de visibilidade de menus administrativos
            const btnAdmin = document.getElementById('btnAdminMenu');  
            if (btnAdmin) {  
                const eAdmin = cargoFinal === 'admin_mercado';
                btnAdmin.classList.toggle('hidden', !eAdmin);  
                btnAdmin.style.display = eAdmin ? 'inline-flex' : 'none';  
            }  

            await verificarStatusCaixaServidor();  
            focarBusca();  
        } else {  
            telaLogin?.classList.remove('hidden');  
            appPrincipal?.classList.add('hidden');  
        }  
    } catch (err) {  
        console.error("[Session Critical Error]:", err);  
    }  
}  

// --- HANDLER DE ATALHOS DE TECLADO COMPLETO E SEGURO ---
function inicializarAtalhosTeclado() {  
    window.addEventListener('keydown', (event) => {  
        // F1 - Abrir Caixa
        if (event.key === 'F1') {  
            event.preventDefault();  
            if (typeof window.gerenciarCaixaModal === 'function') {
                window.gerenciarCaixaModal('abrir');  
            }
        } 
        // F2 - Fechar Caixa
        else if (event.key === 'F2') {  
            event.preventDefault();  
            if (typeof window.gerenciarCaixaModal === 'function') {
                window.gerenciarCaixaModal('fechar');  
            }
        } 
        // F5 - Focar na Busca de Produtos
        else if (event.key === 'F5') {  
            event.preventDefault();  
            if (typeof window.focarBusca === 'function') {
                window.focarBusca();  
            }
        } 
        // F6 - Cancelar Item
        else if (event.key === 'F6') {  
            event.preventDefault();  
            if (typeof window.abrirModalCancelarItem === 'function') {
                window.abrirModalCancelarItem();  
            }
        } 
        // F7 - Cancelar Venda
        else if (event.key === 'F7') {  
            event.preventDefault();  
            if (typeof window.cancelarVenda === 'function') {
                window.cancelarVenda();  
            }
        } 
        // F9 - Finalizar Venda / Checkout
        else if (event.key === 'F9') {  
            event.preventDefault();  
            if (typeof window.abrirModalCheckout === 'function') {
                window.abrirModalCheckout(0.00);  
            } else if (typeof window.finalizarVenda === 'function') {
                window.finalizarVenda();
            }
        } 
        // ESC - Fechar Modais Dinâmicos e Estáticos
        else if (event.key === 'Escape') {  
            // Trata modais módulos dinâmicos sem estourar Uncaught ReferenceError
            if (typeof window.fecharModalFinalizarVenda === 'function') window.fecharModalFinalizarVenda();
            if (typeof window.fecharModalProduto === 'function') window.fecharModalProduto();
            if (typeof window.fecharModalSuperAdmin === 'function') window.fecharModalSuperAdmin();

            // Modais estáticos do caixa
            if (typeof window.fecharModalCaixa === 'function') window.fecharModalCaixa();  
            if (typeof window.fecharModalAutorizacao === 'function') window.fecharModalAutorizacao();  
            if (typeof window.fecharModalCancelarItem === 'function') window.fecharModalCancelarItem();  
            if (typeof window.fecharLeitorCamera === 'function') window.fecharLeitorCamera();  
            if (typeof window.fecharPainelAdmin === 'function') window.fecharPainelAdmin();  
            if (typeof window.fecharSuperAdminMaster === 'function') window.fecharSuperAdminMaster();  
        }  
    });  
}