// ==========================================
// CONFIGURAÇÃO SUPABASE E VARIÁVEIS GLOBAIS (PDV-VS)
// ==========================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';

// Configurando o cliente Supabase com persistência otimizada
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Alias para compatibilidade com os módulos de auth
export const supabase = supabaseClient;

let usuarioAtual = null, empresaAtualId = null, dadosEmpresaAtual = null, cargoUsuarioAtual = null;
let modoTelaAuth = 'login', caixaAberto = false, faturamentoDia = 0, itensVenda = [], produtosCache = [];
let historicoVendasCache = [], html5QrcodeInstance = null, origemLeitor = 'busca';
let acaoCaixaAtual = 'abrir', indiceItemParaRemover = null, deferredPrompt = null;
let produtoEmPesagemAtual = null; 
let cliquesSecretos = 0;
let canalRealtimeSupabase = null;

// ==========================================
// INICIALIZAÇÃO E PWA (CONSOLIDADO)
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const lembrarConectado = localStorage.getItem('pdv_lembrar_conectado') === 'true';
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session && session.user) { 
            usuarioAtual = session.user; 
            if (typeof validarVinculoEmpresaUsuario === 'function') {
                await validarVinculoEmpresaUsuario(); 
            }
        }
    } catch (e) { 
        console.error("PDV-VS Erro ao restaurar sessão:", e); 
    }

    // Gatilho Secreto Super Admin
    const gatilho = document.getElementById('gatilho-super-admin') || document.getElementById('gatilhoSuperAdmin');
    if (gatilho) {
        gatilho.addEventListener('click', () => {
            cliquesSecretos++;
            if (cliquesSecretos >= 5) {
                cliquesSecretos = 0;
                window.location.href = '../super-admin/super-admin.html';
            }
        });
    }

    const rodape = document.getElementById('rodapeSistema');
    if (rodape) {
        rodape.innerHTML = 'PDV-Vancely Software Enterprise | Versão 1.0.0 | Suporte Técnico Ativo';
    }
});

// ==========================================
// SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================
function iniciarSincronizacaoRealtime() {
    if (!empresaAtualId) return;
    
    if (canalRealtimeSupabase) {
        supabaseClient.removeChannel(canalRealtimeSupabase);
    }

    canalRealtimeSupabase = supabaseClient
        .channel('public:produtos_e_vendas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${empresaAtualId}` }, () => {
            if (typeof carregarProdutosDaLoja === 'function') carregarProdutosDaLoja();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'caixas', filter: `empresa_id=eq.${empresaAtualId}` }, () => {
            if (typeof verificarStatusCaixaIndividual === 'function') verificarStatusCaixaIndividual();
        })
        .subscribe();
}

// Atalhos Globais de Teclado
window.addEventListener('keydown', (e) => {
    const appPrincipal = document.getElementById('appPrincipal');
    if (!appPrincipal || appPrincipal.classList.contains('hidden')) return;
    
    if (e.key === 'F1') { e.preventDefault(); if (typeof gerenciarCaixaModal === 'function') gerenciarCaixaModal('abrir'); }
    if (e.key === 'F2') { e.preventDefault(); if (typeof gerenciarCaixaModal === 'function') gerenciarCaixaModal('fechar'); }
    if (e.key === 'F5') { e.preventDefault(); if (typeof focarBusca === 'function') focarBusca(); }
    if (e.key === 'F6') { e.preventDefault(); if (typeof abrirModalCancelarItem === 'function') abrirModalCancelarItem(); }
    if (e.key === 'F7') { e.preventDefault(); if (typeof cancelarVenda === 'function') cancelarVenda(); }
    if (e.key === 'F9') { e.preventDefault(); if (typeof finalizarVenda === 'function') finalizarVenda(); }
});