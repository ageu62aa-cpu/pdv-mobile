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
        if (vinculoError) console.error('PDV-VS: Erro ao buscar vínculo do administrador:', vinculoError);

        let empresaId = vinculo ? vinculo.empresa_id : null;
        if (!empresaId && user.email) {
            const { data: empresaPorEmail, error: emailError } = await supabase
                .from('empresas')
                .select('id')
                .eq('email_admin', user.email)
                .maybeSingle();
            if (emailError) console.error('PDV-VS: Erro ao buscar empresa pelo email do administrador:', emailError);
            if (empresaPorEmail) empresaId = empresaPorEmail.id;
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
        setCargoUsuarioAtual(vinculo?.cargo || 'admin_mercado');
        setDadosEmpresaAtual(empresa);
        window.usuarioAtual = user;
        window.empresaAtualId = empresa.id;
        window.cargoUsuarioAtual = vinculo?.cargo || 'admin_mercado';
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
            ['caixa_status', ['operadores']],
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
                if (abasAfetadas.includes('operadores')) {
                    window.adminStatusCaixasIniciais = null;
                }
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
    }

    try {
        const contexto = await obterContextoAdmin();
        if (!contexto) {
            window.location.href = '../auth/auth.html';
            return;
        }
        const empresaId = contexto.empresa.id;

        const [{ data: produtos, error: produtosError }, { data: statusCaixas, error: caixasError }] = await Promise.all([
            supabase
                .from('produtos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('nome', { ascending: true }),
            supabase
                .from('caixas')
                .select('*')
                .eq('empresa_id', empresaId)
        ]);

        if (produtosError) throw produtosError;
        window.adminProdutosIniciais = produtos || [];
        if (caixasError) {
            window.adminErroStatusCaixas = caixasError.message;
            console.error('PDV-VS: Erro ao carregar caixas:', caixasError);
        } else {
            window.adminStatusCaixasIniciais = statusCaixas || [];
            window.adminErroStatusCaixas = null;
        }

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