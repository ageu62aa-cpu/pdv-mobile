import { initAdminProdutos } from './admin-produtos.js';
import { initAdminOperadores, carregarGestaoOperadores } from './admin-operadores.js';
import { initAdminMaquininhas } from './admin-maquininhas.js';
import { initAdminHistorico } from './admin-historico.js';
import { initAdminPlanos } from './admin-planos.js';
import { adminSupabase as supabase } from '../../core/config.js';
import {
    setUsuarioAtual,
    setEmpresaAtualId,
    setCargoUsuarioAtual,
    setDadosEmpresaAtual
} from '../../core/state.js';
import { obterPerfilEmpresa } from '../../core/perfilEmpresa.js';
import { monitorarSessaoUnica, validarSessaoAtual } from '../../core/sessaoService.js';

let canaisAdminRealtime = [];
let abaAtiva = 'produtos';
let temporizadorAtualizacaoRealtime = null;
let statusRealtimePorTabela = new Map();
let atualizacaoFallbackEmCurso = false;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('admin-conteudo-dinamico');
    const botoesTab = document.querySelectorAll('.tab-btn');
    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : null;
        const abrirPlanos = target?.closest('[data-open-plans-tab]');
        if (!abrirPlanos) return;
        event.preventDefault();
        document.querySelector('.tab-btn[data-tab="planos"]')?.click();
    });

    async function obterContextoAdmin() {
        const sessaoValida = await validarSessaoAtual(supabase, 'admin', {
            exigirSessao: true,
            rotaLogin: '../auth/auth.html'
        });
        if (!sessaoValida) return null;

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            if (userError) console.error('PDV-VS: Falha ao validar a sessão administrativa:', userError);
            window.location.href = '../auth/auth.html';
            return null;
        }

        const { empresaId, cargo } = await obterPerfilEmpresa(supabase, user);
        if (cargo !== 'admin_mercado') {
            window.location.href = '../auth/auth.html';
            return null;
        }

        const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single();
        if (empresaError || !empresa) {
            console.error('PDV-VS: Erro ao carregar a empresa vinculada:', empresaError);
            throw new Error('Erro ao carregar os dados da empresa vinculada.');
        }

        setUsuarioAtual(user);
        setEmpresaAtualId(empresa.id);
        setCargoUsuarioAtual(cargo);
        setDadosEmpresaAtual(empresa);
        window.usuarioAtual = user;
        window.empresaAtualId = empresa.id;
        window.cargoUsuarioAtual = cargo;
        window.dadosEmpresaAtual = empresa;

        return { user, empresa };
    }

    function agendarAtualizacaoRealtime(abasAfetadas) {
        if (!abasAfetadas.includes(abaAtiva)) return;

        window.clearTimeout(temporizadorAtualizacaoRealtime);
        temporizadorAtualizacaoRealtime = window.setTimeout(() => {
            carregarAba(abaAtiva);
        }, 150);
    }

    function iniciarMonitoramentoRealtime(empresaId) {
        canaisAdminRealtime.forEach(canal => supabase.removeChannel(canal));
        statusRealtimePorTabela = new Map();
        canaisAdminRealtime = [
            ['caixas', ['operadores']],
            ['vendas', ['operadores', 'historico']],
            ['cancelamentos_caixa', ['operadores']],
            ['operadores', ['operadores']],
            ['usuarios_empresas', ['operadores']],
            ['produtos', ['produtos']]
        ].map(([tabela, abasAfetadas]) => {
            statusRealtimePorTabela.set(tabela, 'CONNECTING');
            return supabase
                .channel(`admin-${tabela}-${empresaId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: tabela,
                    filter: `empresa_id=eq.${empresaId}`
                }, () => {
                    agendarAtualizacaoRealtime(abasAfetadas);
                })
                .subscribe((status, error) => {
                    statusRealtimePorTabela.set(tabela, status);
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error(`PDV-VS: Falha ao iniciar atualização Realtime de ${tabela}:`, error || status);
                    }
                });
        });
    }

    window.setInterval(() => {
        if (abaAtiva !== 'operadores' || atualizacaoFallbackEmCurso) return;

        atualizacaoFallbackEmCurso = true;
        void carregarGestaoOperadores()
            .catch(error => console.error('PDV-VS: Falha ao atualizar o monitoramento dos caixas:', error))
            .finally(() => { atualizacaoFallbackEmCurso = false; });
    }, 15000);

    document.querySelector('#adminHeaderActions a[aria-label="Sair"]')?.addEventListener('click', async event => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
            console.error('PDV-VS: Não foi possível encerrar a sessão administrativa:', error);
            alert(`Não foi possível encerrar a sessão administrativa: ${error.message}`);
            return;
        }
        localStorage.removeItem('vancely_admin_session');
        sessionStorage.removeItem('vancely_sessao_admin_token');
        sessionStorage.removeItem('vancely_sessao_admin_user');
        window.location.href = '../auth/auth.html';
    });

    async function carregarAba(tabName) {
        abaAtiva = tabName;
        container.innerHTML = `<p class="text-center text-gray-400 py-8">A carregar...</p>`;
        
        botoesTab.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = 'tab-btn text-left px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white transition-colors shadow';
            } else {
                btn.className = 'tab-btn text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-750 hover:text-white transition-colors';
            }
        });

        if (tabName === 'produtos') await initAdminProdutos(container);
        else if (tabName === 'operadores') await initAdminOperadores(container);
        else if (tabName === 'maquininhas') await initAdminMaquininhas(container);
        else if (tabName === 'historico') await initAdminHistorico(container);
        else if (tabName === 'planos') await initAdminPlanos(container);
        else if (tabName === 'configuracoes') carregarConfiguracoesSeguranca(container);
    }

    function carregarConfiguracoesSeguranca(alvo) {
        alvo.innerHTML = `
            <div class="max-w-xl space-y-4">
                <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-800/70 bg-amber-950/20 p-4">
                    <div>
                        <h2 class="text-sm font-bold text-white">Plano e assinatura</h2>
                        <p class="mt-1 text-xs text-gray-400">Confira seus limites e as opções de upgrade.</p>
                    </div>
                    <button type="button" data-open-plans-tab class="rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-500">Planos &amp; Assinatura</button>
                </section>
                <div>
                    <h2 class="text-lg font-bold text-white">Segurança do caixa</h2>
                    <p class="mt-1 text-sm text-gray-400">Configure o PIN solicitado para cancelar itens ou uma venda. Ele será compartilhado com os operadores desta empresa.</p>
                </div>
                <form id="formPinCancelamento" class="space-y-3 rounded-xl border border-gray-700 bg-gray-900/60 p-4">
                    <label for="inputAdminPinConfig" class="block text-xs font-bold uppercase tracking-wide text-gray-300">Novo PIN gerencial</label>
                    <input id="inputAdminPinConfig" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" required class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Mínimo de 4 caracteres">
                    <p id="statusPinCancelamento" class="hidden text-sm" role="status"></p>
                    <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500">Salvar PIN gerencial</button>
                </form>
            </div>`;

        const form = alvo.querySelector('#formPinCancelamento');
        const input = alvo.querySelector('#inputAdminPinConfig');
        const status = alvo.querySelector('#statusPinCancelamento');
        form?.addEventListener('submit', async event => {
            event.preventDefault();
            const pin = input?.value.trim() || '';
            if (pin.length < 4) {
                if (status) {
                    status.textContent = 'O PIN precisa ter pelo menos 4 caracteres.';
                    status.className = 'text-sm text-rose-400';
                }
                return;
            }

            const empresaId = window.empresaAtualId;
            if (!empresaId) {
                if (status) {
                    status.textContent = 'Não foi possível identificar a empresa da sessão.';
                    status.className = 'text-sm text-rose-400';
                }
                return;
            }

            const botao = form.querySelector('button[type="submit"]');
            if (botao) botao.disabled = true;
            try {
                const { error } = await supabase.rpc('pdv_configurar_pin_cancelamento', {
                    p_empresa_id: empresaId,
                    p_pin: pin
                });
                if (error) throw error;
                if (status) {
                    status.textContent = 'PIN salvo. Os operadores já podem usá-lo para autorizar cancelamentos.';
                    status.className = 'text-sm text-emerald-400';
                }
                if (input) input.value = '';
            } catch (error) {
                console.error('PDV-VS: Não foi possível salvar o PIN gerencial:', error);
                if (status) {
                    status.textContent = `Falha ao salvar o PIN: ${error.message}`;
                    status.className = 'text-sm text-rose-400';
                }
            } finally {
                if (botao) botao.disabled = false;
            }
        });
    }

    try {
        const contexto = await obterContextoAdmin();
        if (!contexto) return;
        monitorarSessaoUnica(supabase, 'admin', { rotaLogin: '../auth/auth.html' });
        window.setInterval(() => {
            void validarSessaoAtual(supabase, 'admin', {
                exigirSessao: true,
                rotaLogin: '../auth/auth.html'
            });
        }, 15000);
        const empresaId = contexto.empresa.id;

        const { data: produtos, error: produtosError } = await supabase
            .from('produtos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nome', { ascending: true });

        if (produtosError) throw produtosError;
        window.adminProdutosIniciais = produtos || [];

        iniciarMonitoramentoRealtime(empresaId);

        botoesTab.forEach(btn => {
            btn.addEventListener('click', () => carregarAba(btn.dataset.tab));
        });

        await carregarAba('produtos');
    } catch (error) {
        console.error('PDV-VS: Erro ao inicializar o painel administrativo:', error);
        container.innerHTML = `<p class="text-center text-red-400 py-8">Não foi possível validar a sessão ou carregar os dados do painel. ${error.message}</p>`;
        if (error.message?.toLowerCase().includes('jwt') || error.status === 401) {
            window.location.href = '../auth/auth.html';
        }
    }
});