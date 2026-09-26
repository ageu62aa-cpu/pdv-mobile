// ==========================================
// NÚCLEO DO PAINEL ADMINISTRATIVO (PDV-VS)
// ==========================================

import { empresaAtualId, produtosCache, cargoUsuarioAtual, setEmpresaAtualId } from '../../core/state.js';
import { carregarProdutosCache } from '../../services/produtos.js';
import { focarBusca } from '../pdv/caixa.js';
import { renderizarTabelaAdmin } from './admin-produtos.js';
import { carregarOperadoresLoja } from './admin-operadores.js';
import { carregarMaquininhasAdmin } from './admin-maquininhas.js';
import { carregarHistoricoAdmin } from './admin-historico.js';

// --- UTILITÁRIO INTERNO: RESOLUÇÃO DE EMPRESA ---
export async function resolverEmpresaIdAtual() {
    let idEmpresa = empresaAtualId || localStorage.getItem('empresa_id') || localStorage.getItem('pdv_empresa_id');
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: vincData } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (vincData && vincData.empresa_id) {
                idEmpresa = vincData.empresa_id;
            } else if (!idEmpresa) {
                idEmpresa = session.user.id;
            }
            setEmpresaAtualId(idEmpresa);
            localStorage.setItem('empresa_id', idEmpresa);
        }
    } catch (e) {
        console.error("PDV-VS: Erro ao validar empresa na sessão:", e);
    }
    return idEmpresa;
}

export async function mudarAbaAdmin(aba) {
    const abasPossiveis = ['Produtos', 'Operadores', 'Maquininhas', 'Historico', 'Configuracoes'];
    
    abasPossiveis.forEach(a => {
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
    
    switch (activeAba) {
        case 'Produtos':
            await carregarProdutosCache();
            renderizarTabelaAdmin(produtosCache);
            break;
        case 'Operadores':
            await carregarOperadoresLoja();
            break;
        case 'Maquininhas':
            await carregarMaquininhasAdmin();
            break;
        case 'Historico':
            await carregarHistoricoAdmin();
            break;
        case 'Configuracoes':
            preencherDadosConfiguracao();
            break;
    }
}

function preencherDadosConfiguracao() {
    const inputPinConfig = document.getElementById('inputAdminPinConfig');
    if (inputPinConfig) {
        inputPinConfig.value = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    }
    const inputNomeConfig = document.getElementById('inputAdminNomeEmpresaConfig');
    const inputWapConfig = document.getElementById('inputAdminWhatsappConfig');
    if (window.dadosEmpresaAtual) {
        if (inputNomeConfig) inputNomeConfig.value = window.dadosEmpresaAtual.nome_mercado || '';
        if (inputWapConfig) inputWapConfig.value = window.dadosEmpresaAtual.whatsapp || '';
    }
}

export async function recarregarDadosAdmin() {
    await carregarProdutosCache();
    renderizarTabelaAdmin(produtosCache);
    if (cargoUsuarioAtual === 'admin_mercado') {
        await Promise.all([
            carregarHistoricoAdmin(),
            carregarOperadoresLoja(),
            carregarMaquininhasAdmin()
        ]);
    }
    alert('PDV-VS: Dados do painel administrativo atualizados com sucesso!');
}

export async function abrirPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('flex');
        modalAdmin.classList.remove('hidden'); 
    }

    await resolverEmpresaIdAtual();

    try {
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
        
        if (cargoUsuarioAtual === 'admin_mercado') {
            await Promise.all([
                carregarOperadoresLoja(),
                carregarHistoricoAdmin(),
                carregarMaquininhasAdmin()
            ]);
        }
    } catch (e) {
        console.error("PDV-VS: Erro ao carregar dados do painel:", e);
    }

    mudarAbaAdmin('produtos'); 
}

export function fecharPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('hidden'); 
        modalAdmin.classList.remove('flex');
    }
    focarBusca();
}

export async function salvarConfiguracoesEmpresaAdmin() {
    const novoNome = document.getElementById('inputAdminNomeEmpresaConfig')?.value.trim() || '';
    const novoWap = document.getElementById('inputAdminWhatsappConfig')?.value.trim() || '';

    if (!novoNome) {
        alert('PDV-VS: O nome do estabelecimento não pode ficar vazio.');
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('empresas')
            .update({ nome_mercado: novoNome, whatsapp: novoWap })
            .eq('id', empresaAtualId);

        if (error) throw error;

        const tituloAppEmpresa = document.getElementById('tituloAppEmpresa');
        if (tituloAppEmpresa) tituloAppEmpresa.innerText = novoNome;

        alert('PDV-VS: Dados do estabelecimento atualizados com sucesso!');
    } catch (e) {
        alert('PDV-VS: Erro ao atualizar configurações: ' + e.message);
    }
}

Object.assign(window, {
    mudarAbaAdmin,
    recarregarDadosAdmin,
    abrirPainelAdmin,
    fecharPainelAdmin,
    salvarConfiguracoesEmpresaAdmin
});