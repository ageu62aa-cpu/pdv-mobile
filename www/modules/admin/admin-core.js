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
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.error('PDV-VS: Falha ao validar a sessão administrativa:', authError);
            window.location.href = '../auth/auth.html';
            return null;
        }
        if (!user) return null;

        const tabelasVinculo = ['empresas', 'tenants', 'perfis'];
        const colunasUsuario = ['user_id', 'auth_id', 'id'];
        const errosConsulta = [];

        async function buscarVinculoPorIdUsuario() {
            for (const tabela of tabelasVinculo) {
                for (const colunaUsuario of colunasUsuario) {
                    const { data, error } = await supabase
                        .from(tabela)
                        .select('*')
                        .eq(colunaUsuario, user.id)
                        .maybeSingle();

                    if (error) {
                        errosConsulta.push(`${tabela}.${colunaUsuario}: ${error.message}`);
                        continue;
                    }
                    if (data) return { tabela, registro: data };
                }
            }
            return null;
        }

        async function buscarVinculoPorEmail() {
            for (const tabela of tabelasVinculo) {
                const { data, error } = await supabase
                    .from(tabela)
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();
                if (error) {
                    errosConsulta.push(`${tabela}.email: ${error.message}`);
                    continue;
                }
                if (data) return { tabela, registro: data };
            }
            return null;
        }

        let vinculo = await buscarVinculoPorIdUsuario();
        if (!vinculo && user.email) vinculo = await buscarVinculoPorEmail();
        if (!vinculo) {
            const detalhe = errosConsulta.length ? ` Consultas: ${errosConsulta.join(' | ')}` : '';
            throw new Error(`Não foi encontrada uma empresa vinculada ao administrador ${user.email || user.id}.${detalhe}`);
        }

        const registro = vinculo.registro;
        const empresaId = registro.empresa_id || registro.tenant_id || registro.id;
        if (!empresaId) throw new Error(`O vínculo encontrado em ${vinculo.tabela} não informa o identificador da empresa.`);

        let empresa = registro;
        if (vinculo.tabela !== 'empresas' || registro.id !== empresaId) {
            const { data: empresaEncontrada, error: empresaError } = await supabase
                .from('empresas')
                .select('*')
                .eq('id', empresaId)
                .maybeSingle();
            if (empresaError) throw empresaError;
            if (empresaEncontrada) empresa = empresaEncontrada;
        }

        setUsuarioAtual(user);
        setEmpresaAtualId(empresaId);
        setCargoUsuarioAtual('admin_mercado');
        setDadosEmpresaAtual(empresa);
        window.usuarioAtual = user;
        window.empresaAtualId = empresaId;
        window.cargoUsuarioAtual = 'admin_mercado';
        window.dadosEmpresaAtual = empresa;
        localStorage.setItem('empresa_id', empresaId);
        localStorage.setItem('empresaAtualId', empresaId);
        localStorage.setItem('pdv_empresa_id', empresaId);

        return { user, empresaId };
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

        const [{ data: produtos, error: produtosError }, { data: statusCaixas, error: caixasError }] = await Promise.all([
            supabase
                .from('produtos')
                .select('*')
                .eq('empresa_id', contexto.empresaId)
                .order('nome', { ascending: true }),
            supabase
                .from('caixa_status')
                .select('*')
                .eq('empresa_id', contexto.empresaId)
        ]);

        if (produtosError) throw produtosError;
        window.adminProdutosIniciais = produtos || [];
        if (caixasError) {
            window.adminErroStatusCaixas = caixasError.message;
            console.error('PDV-VS: Erro ao carregar caixa_status:', caixasError);
        } else {
            window.adminStatusCaixasIniciais = statusCaixas || [];
            window.adminErroStatusCaixas = null;
        }

        iniciarMonitoramentoRealtime(contexto.empresaId);

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