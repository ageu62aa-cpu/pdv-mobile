// ==========================================
// NÚCLEO DO CAIXA E SESSÃO (PDV-VS)
// ==========================================

import { 
    usuarioAtual, empresaAtualId, cargoUsuarioAtual, caixaAberto, faturamentoDia, 
    setCaixaAberto, setFaturamentoDia, setEmpresaAtualId 
} from '../../core/state.js';
import { carregarProdutosCache } from '../../services/produtos.js';
import { carregarHistoricoAdmin, carregarOperadoresLoja } from '../admin/admin-core.js';
import { focarBusca, atualizarTabelaVenda } from './caixa-vendas.js';

export let valorTrocoAbertura = 0;
export let horaAberturaCaixa = null;

export const getSupabase = () => window.supabaseClient;

export async function verificarStatusCaixaServidor() {
    if (!empresaAtualId || !usuarioAtual) return;
    try {
        const { data, error } = await getSupabase()
            .from('caixas')
            .select('status, valor_abertura, faturamento_dia')
            .eq('empresa_id', empresaAtualId)
            .eq('user_id', usuarioAtual.id)
            .eq('status', 'ABERTO')
            .maybeSingle();

        if (!error && data) {
            setCaixaAberto(true);
            valorTrocoAbertura = Number(data.valor_abertura) || 0;
            const fatNoBanco = Number(data.faturamento_dia) || 0;

            if (fatNoBanco !== faturamentoDia) {
                setFaturamentoDia(fatNoBanco);
                const txtFat = document.getElementById('txtFaturamentoDia');
                if (txtFat) txtFat.innerText = `R$ ${fatNoBanco.toFixed(2)}`;
            }
        } else {
            setCaixaAberto(false);
        }
        atualizarBadgesCaixaInterface();

        if (cargoUsuarioAtual === 'admin_mercado') {
            carregarOperadoresLoja?.();
            carregarHistoricoAdmin?.();
        }
    } catch (err) {
        console.error('PDV-VS: Erro ao verificar status do caixa no servidor:', err);
    }
}

export function iniciarRealtimeCaixa() {
    if (!empresaAtualId) return;
    
    getSupabase()
        .channel('escuta_mudancas_caixa')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'caixas', filter: `empresa_id=eq.${empresaAtualId}` },
            (payload) => {
                if (payload.new && payload.new.user_id === usuarioAtual?.id) {
                    const novoStatus = payload.new.status === 'ABERTO';
                    const novoFat = Number(payload.new.faturamento_dia) || 0;
                    valorTrocoAbertura = Number(payload.new.valor_abertura) || 0;

                    if (novoStatus !== caixaAberto) {
                        setCaixaAberto(novoStatus);
                        atualizarBadgesCaixaInterface();
                    }

                    if (novoFat !== faturamentoDia) {
                        setFaturamentoDia(novoFat);
                        const txtFat = document.getElementById('txtFaturamentoDia');
                        if (txtFat) txtFat.innerText = `R$ ${novoFat.toFixed(2)}`;
                    }
                }

                if (cargoUsuarioAtual === 'admin_mercado') {
                    carregarOperadoresLoja?.();
                    carregarHistoricoAdmin?.();
                }
            }
        )
        .subscribe();
}

export async function atualizarPaginaCompleta() {
    if (confirm('PDV-VS: Deseja atualizar e sincronizar todos os dados do sistema?')) {
        await carregarProdutosCache();
        await verificarStatusCaixaServidor();
        if (cargoUsuarioAtual === 'admin_mercado') {
            await carregarHistoricoAdmin?.();
            await carregarOperadoresLoja?.();
        }
        alert('PDV-VS: Dados sincronizados com sucesso!');
        focarBusca();
    }
}

export async function realizarLogout() { 
    if (caixaAberto) {
        alert('PDV-VS: ATENÇÃO! Você não pode sair do sistema com o caixa individual aberto. Faça o fechamento antes de sair.');
        return;
    }
    if (confirm('PDV-VS: Deseja realmente encerrar a sessão?')) {
        await getSupabase().auth.signOut(); 
        location.reload(); 
    }
}

export function atualizarBadgesCaixaInterface() {
    document.querySelectorAll('.badgeCaixaStatus').forEach(b => {
        b.innerText = caixaAberto ? 'ABERTO' : 'FECHADO';
        b.className = caixaAberto 
            ? 'badgeCaixaStatus text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded font-semibold' 
            : 'badgeCaixaStatus text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded font-semibold';
    });
}

setTimeout(() => {
    iniciarRealtimeCaixa();
    verificarStatusCaixaServidor();
    if (cargoUsuarioAtual === 'admin_mercado') {
        carregarOperadoresLoja?.();
        carregarHistoricoAdmin?.();
    }
}, 500);

window.addEventListener('focus', () => {
    verificarStatusCaixaServidor();
});

Object.assign(window, {
    verificarStatusCaixaServidor, iniciarRealtimeCaixa, atualizarPaginaCompleta,
    realizarLogout, atualizarBadgesCaixaInterface
});