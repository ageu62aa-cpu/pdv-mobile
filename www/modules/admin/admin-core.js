import { initAdminProdutos } from './admin-produtos.js';
import { initAdminOperadores } from './admin-operadores.js';
import { initAdminMaquininhas } from './admin-maquininhas.js';
import { initAdminHistorico } from './admin-historico.js';
import { supabase } from '../../core/config.js';
import {
    setUsuarioAtual,
    setEmpresaAtualId,
    setCargoUsuarioAtual,
    setDadosEmpresaAtual
} from '../../core/state.js';

let canaisAdminRealtime = [];
let abaAtiva = 'produtos';
let temporizadorAtualizacaoRealtime = null;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('admin-conteudo-dinamico');
    const botoesTab = document.querySelectorAll('.tab-btn');

    async function obterContextoAdmin() {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            if (userError) console.error('PDV-VS: Falha ao validar a sessão administrativa:', userError);
            window.location.href = '../auth/auth.html';
            return null;
        }

        const { data: vinculo, error: vinculoError } = await supabase
            .from('usuarios_empresas')
            .select('empresa_id, cargo')
            .eq('user_id', user.id)
            .maybeSingle();
        if (vinculoError) throw vinculoError;

        let empresaId = vinculo ? vinculo.empresa_id : null;
        let cargo = vinculo?.cargo || null;
        if (!empresaId && user.email) {
            const { data: empresaPorEmail, error: emailError } = await supabase
                .from('empresas')
                .select('id')
                .eq('email_admin', user.email)
                .maybeSingle();
            if (emailError) console.error('PDV-VS: Erro ao buscar empresa pelo email do administrador:', emailError);
            if (empresaPorEmail) {
                empresaId = empresaPorEmail.id;
                cargo = 'admin_mercado';
            }
        }
        if (cargo !== 'admin_mercado') {
            window.location.href = cargo === 'operador' ? '../pdv/caixa-core.html' : '../auth/auth.html';
            return null;
        }
        if (!empresaId) throw new Error('Não foi encontrada uma empresa vinculada ao administrador autenticado.');

        const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single();
        if (empresaError || !empresa) {
            console.error('PDV-VS: Erro ao carregar a empresa vinculada:', empresaError);
            throw new Error('Erro ao carregar os dados da empresa vinculada.');
        }

        localStorage.setItem('empresa_id', empresa.id);
        localStorage.setItem('empresa_dados', JSON.stringify(empresa));
        localStorage.setItem('user_email', user.email || '');

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
        canaisAdminRealtime = [
            ['caixas', ['operadores']],
            ['vendas', ['operadores', 'historico']],
            ['produtos', ['produtos']]
        ].map(([tabela, abasAfetadas]) => supabase
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
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`PDV-VS: Falha ao iniciar atualização Realtime de ${tabela}:`, error || status);
                }
            }));
    }

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
        else if (tabName === 'configuracoes') carregarConfiguracoesSeguranca(container);
    }

    function carregarConfiguracoesSeguranca(alvo) {
        alvo.innerHTML = `
            <div class="max-w-xl space-y-4">
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