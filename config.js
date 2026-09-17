// ==========================================
// CONFIGURAÇÃO SUPABASE E VARIÁVEIS GLOBAIS
// ==========================================
const SUPABASE_URL = 'https://vbdglgmxaywntmjriccf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZGdsZ214YXl3bnRtanJpY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODgzOTEsImV4cCI6MjEwNTE2NDM5MX0.S_IUvajnn7Qk7yNtkfBru9xsOjUkKhkJ0J0doikrWSs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioAtual = null, empresaAtualId = null, dadosEmpresaAtual = null, cargoUsuarioAtual = null;
let modoTelaAuth = 'login', caixaAberto = false, faturamentoDia = 0, itensVenda = [], produtosCache = [];
let historicoVendasCache = [], html5QrcodeInstance = null, origemLeitor = 'busca';
let acaoCaixaAtual = 'abrir', indiceItemParaRemover = null, deferredPrompt = null;
let produtoEmPesagemAtual = null; 

// ==========================================
// INICIALIZAÇÃO E PWA
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) { 
            usuarioAtual = session.user; 
            await validarVinculoEmpresaUsuario(); 
        }
    } catch (e) { 
        console.error("Erro ao restaurar sessão:", e); 
    }
});

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e;
    const btnInstalar = document.getElementById('btnInstalarPwa');
    if (btnInstalar) btnInstalar.classList.remove('hidden');
});

// Gatilho secreto Super Admin
let cliquesSecretos = 0;
document.addEventListener('DOMContentLoaded', () => {
    const gatilho = document.getElementById('gatilhoSuperAdmin');
    if (gatilho) {
        gatilho.addEventListener('click', () => {
            cliquesSecretos++;
            if (cliquesSecretos >= 5) {
                cliquesSecretos = 0;
                document.getElementById('telaLoginSuperAdmin').classList.remove('hidden');
                setTimeout(() => document.getElementById('superAdminEmail').focus(), 100);
            }
        });
    }
});

// Atalhos globais de teclado do PDV
window.addEventListener('keydown', (e) => {
    const appPrincipal = document.getElementById('appPrincipal');
    if (!appPrincipal || appPrincipal.classList.contains('hidden')) return;
    
    if (e.key === 'F1') { e.preventDefault(); gerenciarCaixaModal('abrir'); }
    if (e.key === 'F2') { e.preventDefault(); gerenciarCaixaModal('fechar'); }
    if (e.key === 'F5') { e.preventDefault(); focarBusca(); }
    if (e.key === 'F6') { e.preventDefault(); abrirModalCancelarItem(); }
    if (e.key === 'F7') { e.preventDefault(); cancelarVenda(); }
    if (e.key === 'F9') { e.preventDefault(); finalizarVenda(); }
});