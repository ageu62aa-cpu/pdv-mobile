/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Corrigido para garantir persistência do Admin, isolamento SaaS e tempo real robusto.
 */
import { adminSupabase as supabase, loginSupabase } from '../../core/config.js';

function escaparTextoHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function formatarDinheiro(valor) {
    return `R$ ${(Number(valor) || 0).toFixed(2)}`;
}

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center border-b border-gray-700 pb-4">
                <div>
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-users-gear text-emerald-500"></i>
                        <span>Terminais e Caixas</span>
                    </h2>
                    <p class="text-xs text-gray-400 mt-0.5">Terminais associados a operadores cadastrados, mesmo sem sessão ativa. Status e movimentos atualizados em tempo real.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button id="btn-cadastrar-operador" type="button" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5">
                        <i class="fa-solid fa-user-plus"></i> Cadastrar novo operador
                    </button>
                    <button id="btn-atualizar-operadores" type="button" class="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-2 rounded-lg border border-gray-700 transition flex items-center gap-1.5">
                        <i class="fa-solid fa-rotate-right"></i> Atualizar Dados
                    </button>
                </div>
            </div>

            <div id="modal-cadastro-operador" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/80 p-4">
                <form id="form-cadastro-operador" class="w-full max-w-md space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
                    <div class="flex items-center justify-between border-b border-gray-700 pb-3">
                        <h3 class="text-base font-bold text-white">Cadastrar operador desta empresa</h3>
                        <button id="btn-fechar-cadastro-operador" type="button" class="text-gray-400 hover:text-white" aria-label="Fechar">&times;</button>
                    </div>
                    <p class="text-xs text-gray-400">A conta será vinculada exclusivamente à empresa deste administrador.</p>
                    <label class="block text-xs font-bold text-gray-300">
                        Nome do operador
                        <input id="novo-operador-nome" type="text" required autocomplete="name" class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                    </label>
                    <label class="block text-xs font-bold text-gray-300">
                        E-mail de acesso
                        <input id="novo-operador-email" type="email" required autocomplete="email" class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                    </label>
                    <label class="block text-xs font-bold text-gray-300">
                        Senha inicial
                        <input id="novo-operador-senha" type="password" required minlength="6" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white">
                    </label>
                    <p id="status-cadastro-operador" class="hidden text-xs" role="status"></p>
                    <div class="flex gap-2">
                        <button id="btn-cancelar-cadastro-operador" type="button" class="w-1/2 rounded-lg bg-gray-700 py-2.5 text-xs font-bold text-gray-200 hover:bg-gray-600">Cancelar</button>
                        <button type="submit" class="w-1/2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Criar conta</button>
                    </div>
                </form>
            </div>

            <div id="grid-operadores-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="col-span-2 text-center py-10 text-gray-500 text-sm">Carregando painel de caixas...</div>
            </div>

            <section class="space-y-3 border-t border-gray-700 pt-5">
                <div>
                    <h3 class="text-sm font-bold text-white">Vendas de hoje por nome de comissão (F2)</h3>
                    <p class="text-xs text-gray-400">Abra cada janela para conferir pagamentos, juros e vendas do operador.</p>
                </div>
                <div id="resumo-comissao-operadores" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <p class="text-sm text-gray-400">Carregando faturamento dos operadores...</p>
                </div>
            </section>
        </div>
    `;

    document.getElementById('btn-atualizar-operadores').addEventListener('click', () => carregarGestaoOperadores());
    document.getElementById('btn-cadastrar-operador').addEventListener('click', () => {
        void abrirCadastroOperador();
    });
    document.getElementById('btn-fechar-cadastro-operador').addEventListener('click', fecharCadastroOperador);
    document.getElementById('btn-cancelar-cadastro-operador').addEventListener('click', fecharCadastroOperador);
    document.getElementById('form-cadastro-operador').addEventListener('submit', salvarNovoOperador);
    
    await carregarGestaoOperadores();
    
}

function fecharCadastroOperador() {
    const modal = document.getElementById('modal-cadastro-operador');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
}

async function abrirCadastroOperador() {
    try {
        const empresaId = await obterEmpresaIdSeguro();
        if (!empresaId) throw new Error('Não foi possível identificar a empresa deste administrador.');

        const [{ data: plano, error: erroPlano }, { count, error: erroContagem }] = await Promise.all([
            supabase.rpc('vancely_get_tenant_entitlements', { p_empresa_id: empresaId }).maybeSingle(),
            supabase.from('usuarios_empresas').select('user_id', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .eq('cargo', 'operador')
        ]);
        if (erroPlano || erroContagem) throw erroPlano || erroContagem;

        const limite = Math.max(0, Number(plano?.limite_operadores ?? 0));
        if ((count || 0) >= limite) {
            alert(`O limite do plano ${plano?.nome || ''} foi atingido: ${count || 0} de ${limite} operador(es). Faça upgrade para adicionar operadores.`);
            return;
        }

        document.getElementById('status-cadastro-operador')?.classList.add('hidden');
        const modal = document.getElementById('modal-cadastro-operador');
        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
        document.getElementById('novo-operador-nome')?.focus();
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error('PDV-VS: Não foi possível abrir o cadastro de operadores:', error);
        alert(`Não foi possível abrir o cadastro de operadores: ${detail}`);
    }
}

async function salvarNovoOperador(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const botao = form.querySelector('button[type="submit"]');
    const status = document.getElementById('status-cadastro-operador');
    const nome = document.getElementById('novo-operador-nome').value.trim();
    const email = document.getElementById('novo-operador-email').value.trim();
    const password = document.getElementById('novo-operador-senha').value;
    if (!form.reportValidity()) return;
    if (!nome) {
        alert('Informe o nome do operador.');
        return;
    }

    botao.disabled = true;
    try {
        const empresaId = await obterEmpresaIdSeguro();
        if (!empresaId) throw new Error('Não foi possível identificar a empresa deste administrador.');

        const { data, error: erroCadastro } = await loginSupabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: nome } }
        });
        if (erroCadastro) throw erroCadastro;
        if (!data.user) throw new Error('O Supabase não retornou o usuário criado.');
        if (data.user.identities?.length === 0) {
            throw new Error('Este e-mail já possui uma conta. Use outro e-mail para cadastrar um operador.');
        }

        const { error: erroVinculo } = await supabase.from('usuarios_empresas').insert([{
            user_id: data.user.id,
            empresa_id: empresaId,
            cargo: 'operador'
        }]);
        if (erroVinculo) {
            console.error('PDV-VS: Conta criada, mas não foi possível vinculá-la à empresa:', erroVinculo);
            throw new Error(`A conta foi criada, mas não foi possível vinculá-la a esta empresa: ${erroVinculo.message}`);
        }

        fecharCadastroOperador();
        form.reset();
        await carregarGestaoOperadores();
        alert(data.session
            ? 'Operador cadastrado e vinculado a esta empresa com sucesso.'
            : 'Operador cadastrado. Se a confirmação por e-mail estiver ativa no Supabase, confirme o endereço antes do primeiro login.');
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error('PDV-VS: Erro ao cadastrar operador:', error);
        if (status) {
            status.textContent = detail;
            status.className = 'text-xs text-rose-400';
        }
        alert(`Não foi possível cadastrar o operador: ${detail}`);
    } finally {
        botao.disabled = false;
    }
}

async function obterEmpresaIdSeguro() {
    // 1. Tenta a variável global se existir
    if (window.empresaAtualId) return window.empresaAtualId;

    // 2. Tenta recuperar da sessão isolada do Admin no localStorage
    try {
        const adminSessao = JSON.parse(localStorage.getItem('vancely_admin_session') || '{}');
        if (adminSessao?.empresa_id) {
            window.empresaAtualId = adminSessao.empresa_id;
            return adminSessao.empresa_id;
        }
    } catch (e) {
        console.error('Erro ao ler sessão admin:', e);
    }

    // 3. Fallback buscando pelo usuário logado no Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: vinculo } = await supabase
        .from('usuarios_empresas')
        .select('empresa_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (vinculo?.empresa_id) {
        window.empresaAtualId = vinculo.empresa_id;
        return vinculo.empresa_id;
    }

    return null;
}

export async function carregarGestaoOperadores() {
    const gridContainer = document.getElementById('grid-operadores-container');
    if (!gridContainer) return;
    
    const empresaIdDoAdmin = await obterEmpresaIdSeguro();
    if (!empresaIdDoAdmin) {
        gridContainer.innerHTML = `<div class="col-span-2 text-center py-8 text-red-400 text-sm">Erro crítico: Empresa não identificada para este Administrador. Faça login novamente.</div>`;
        return;
    }

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);

    const [
        { data: caixas, error: erroCaixas },
        { data: perfis, error: erroPerfis },
        { data: operadoresTabela, error: erroOpTabela },
        { data: vendas, error: erroVendas },
        { data: cancelamentos, error: erroCancelamentos }
    ] = await Promise.all([
        supabase.from('caixas').select('*').eq('empresa_id', empresaIdDoAdmin).order('created_at', { ascending: false }),
        supabase.from('usuarios_empresas').select('user_id, cargo').eq('empresa_id', empresaIdDoAdmin),
        supabase.from('operadores').select('*').eq('empresa_id', empresaIdDoAdmin),
        supabase.from('vendas').select('operador, operador_nome, itens, valor_total, created_at')
            .eq('empresa_id', empresaIdDoAdmin)
            .gte('created_at', inicio.toISOString())
            .lt('created_at', fim.toISOString()),
        supabase.from('cancelamentos_caixa').select('user_id, quantidade')
            .eq('empresa_id', empresaIdDoAdmin)
            .gte('created_at', inicio.toISOString())
            .lt('created_at', fim.toISOString())
    ]);

    if (erroCaixas) console.error('PDV-VS: Erro ao carregar caixas:', erroCaixas);
    if (erroPerfis) console.error('PDV-VS: Erro ao carregar perfis:', erroPerfis);
    if (erroOpTabela) console.error('PDV-VS: Erro ao carregar operadores:', erroOpTabela);
    if (erroVendas) console.error('PDV-VS: Erro ao carregar vendas dos terminais:', erroVendas);
    if (erroCancelamentos) console.error('PDV-VS: Erro ao carregar cancelamentos dos terminais:', erroCancelamentos);

    if (erroCaixas || erroPerfis || erroOpTabela || erroVendas || erroCancelamentos) {
        const erro = erroCaixas || erroPerfis || erroOpTabela || erroVendas || erroCancelamentos;
        gridContainer.innerHTML = `<div class="col-span-2 text-center py-8 text-red-400 text-sm">Erro ao carregar status dos caixas. ${escaparTextoHtml(erro.message)}</div>`;
        await carregarFaturamentoOperadoresHoje(empresaIdDoAdmin);
        return;
    }

    const operadoresPorId = new Map((operadoresTabela || []).map(op => [op.user_id || op.id, op]));
    const perfisDaEmpresa = (perfis || [])
        .filter(perfil => perfil.cargo === 'operador')
        .map(perfil => ({
            ...perfil,
            ...(operadoresPorId.get(perfil.user_id) || {}),
            user_id: perfil.user_id
        }));

    const primeiroCaixaPorUsuario = new Map();
    (caixas || []).forEach(caixa => {
        if (!caixa.user_id) return;
        const existente = primeiroCaixaPorUsuario.get(caixa.user_id);
        if (!existente || String(caixa.created_at || '') < String(existente.created_at || '')) {
            primeiroCaixaPorUsuario.set(caixa.user_id, caixa);
        }
    });

    const idsPerfis = new Set(perfisDaEmpresa.map(p => p.user_id));
    (operadoresTabela || []).forEach(op => {
        const opId = op.user_id || op.id;
        if (opId && !idsPerfis.has(opId)) {
            perfisDaEmpresa.push({ 
                user_id: opId, 
                cargo: 'operador', 
                nome_extra: op.nome || op.email,
                email: op.email,
                created_at: op.created_at
            });
            idsPerfis.add(opId);
        }
    });

    (caixas || []).forEach(caixa => {
        if (caixa.user_id && !idsPerfis.has(caixa.user_id)) {
            perfisDaEmpresa.push({
                user_id: caixa.user_id,
                cargo: 'operador',
                nome_extra: caixa.operador_nome,
                created_at: primeiroCaixaPorUsuario.get(caixa.user_id)?.created_at
            });
            idsPerfis.add(caixa.user_id);
        }
    });

    if (perfisDaEmpresa.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
                <i class="fa-solid fa-users-slash text-3xl text-gray-600 mb-2"></i>
                <p class="text-sm">Nenhum terminal ou operador cadastrado para esta empresa.</p>
            </div>`;
        await carregarFaturamentoOperadoresHoje(empresaIdDoAdmin);
        return;
    }

    const caixaMaisRecentePorUsuario = new Map();
    (caixas || []).forEach(caixa => {
        if (caixa.user_id && !caixaMaisRecentePorUsuario.has(caixa.user_id)) {
            caixaMaisRecentePorUsuario.set(caixa.user_id, caixa);
        }
        if (caixa.operador_id && !caixaMaisRecentePorUsuario.has(caixa.operador_id)) {
            caixaMaisRecentePorUsuario.set(caixa.operador_id, caixa);
        }
    });

    const cancelamentosPorUsuario = new Map();
    (cancelamentos || []).forEach(cancelamento => {
        const total = cancelamentosPorUsuario.get(cancelamento.user_id) || 0;
        cancelamentosPorUsuario.set(
            cancelamento.user_id,
            total + (Number(cancelamento.quantidade) || 0)
        );
    });

    const resumoVendasPorOperador = new Map();
    (vendas || []).forEach(venda => {
        const nome = String(venda.operador_nome || venda.operador || '').trim().toLocaleLowerCase();
        if (!nome) return;
        const resumo = resumoVendasPorOperador.get(nome) || { vendidos: 0, faturamento: 0 };
        const itens = Array.isArray(venda.itens) ? venda.itens : [];
        resumo.vendidos += itens.reduce((soma, item) => soma + Math.max(0, Number(item.qtd) || 0), 0);
        resumo.faturamento += Number(venda.valor_total) || 0;
        [venda.operador_nome, venda.operador]
            .filter(Boolean)
            .forEach(identificador => resumoVendasPorOperador.set(String(identificador).trim().toLocaleLowerCase(), resumo));
    });

    const obterResumoOperador = perfil => {
        const operador = operadoresPorId.get(perfil.user_id) || {};
        const identificadores = [perfil.email, operador.email, perfil.nome_extra, operador.nome]
            .filter(Boolean)
            .map(valor => String(valor).trim().toLocaleLowerCase());
        return identificadores.map(chave => resumoVendasPorOperador.get(chave)).find(Boolean)
            || { vendidos: 0, faturamento: 0 };
    };

    perfisDaEmpresa.sort((a, b) => {
        const operadorA = operadoresPorId.get(a.user_id) || {};
        const operadorB = operadoresPorId.get(b.user_id) || {};
        const dataA = a.created_at || operadorA.created_at || primeiroCaixaPorUsuario.get(a.user_id)?.created_at || '';
        const dataB = b.created_at || operadorB.created_at || primeiroCaixaPorUsuario.get(b.user_id)?.created_at || '';
        return String(dataA).localeCompare(String(dataB)) || String(a.user_id).localeCompare(String(b.user_id));
    });
    
    gridContainer.innerHTML = perfisDaEmpresa.map((perfil, index) => {
        const operador = operadoresPorId.get(perfil.user_id) || {};
        const caixa = caixaMaisRecentePorUsuario.get(perfil.user_id)
            || (caixas || []).find(c => c.operador_nome === perfil.nome_extra || c.vendedor_nome === perfil.nome_extra);
        const resumoHoje = obterResumoOperador(perfil);

        const isOpen = String(caixa?.status || '').toUpperCase() === 'ABERTO';
        const faturamento = Number(resumoHoje.faturamento || 0).toFixed(2);
        const valorTroco = Number(caixa?.valor_abertura || 0).toFixed(2);
        const sangrias = Number(caixa?.sangrias || 0);
        const terminalNumero = `#${String(index + 1).padStart(2, '0')}`;
        const tipoPerfil = 'Operador / Caixa';
        const nomeExibicao = perfil.nome_extra || operador.nome || operador.email
            || caixa?.operador_nome || caixa?.vendedor_nome || caixa?.nome_operador || 'Operador';
        const itensCancelados = cancelamentosPorUsuario.get(perfil.user_id) || 0;

        const cardBorder = isOpen ? 'border-emerald-500/50 bg-gray-900/90 shadow-emerald-950/20' : 'border-gray-800 bg-gray-900/60';
        const statusBadge = isOpen 
            ? '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center w-fit gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caixa Aberto</span>'
            : '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/60 text-red-400 border border-red-900 flex items-center w-fit gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span> Caixa Fechado</span>';

        return `
            <div class="border ${cardBorder} rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-4 transition-all">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">${tipoPerfil}</span>
                        <h3 class="font-bold text-base text-white mt-0.5 truncate max-w-[240px]" title="${escaparTextoHtml(nomeExibicao)}">
                            ${escaparTextoHtml(nomeExibicao)}
                        </h3>
                    </div>
                    <div>${statusBadge}</div>
                </div>

                <div class="grid grid-cols-2 gap-3 bg-gray-950/50 p-3.5 rounded-xl border border-gray-800/80">
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Faturamento do Dia</span>
                        <span class="text-lg font-extrabold text-emerald-400 font-mono">R$ ${faturamento}</span>
                    </div>
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Troco Inicial</span>
                        <span class="text-sm font-bold text-gray-200 font-mono">R$ ${valorTroco}</span>
                        ${sangrias ? `<span class="text-[10px] text-amber-400 block">Sangrias: R$ ${sangrias.toFixed(2)}</span>` : ''}
                    </div>
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Itens vendidos hoje</span>
                        <span class="text-sm font-bold text-gray-200">${Number(resumoHoje.vendidos).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                    </div>
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Itens cancelados hoje</span>
                        <span class="text-sm font-bold text-amber-300">${Number(itensCancelados).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-400">
                    <span>Terminal / Caixa: <strong class="text-emerald-400">${terminalNumero}</strong></span>
                    <span class="text-[11px] text-gray-500">${caixa ? 'Tempo real' : 'Sem sessão registrada'}</span>
                </div>
            </div>
        `;
    }).join('');

    await carregarFaturamentoOperadoresHoje(empresaIdDoAdmin);
}

async function carregarFaturamentoOperadoresHoje(empresaId) {
    const container = document.getElementById('resumo-comissao-operadores');
    if (!container) return;

    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);

    const { data: vendas, error } = await supabase
        .from('vendas')
        .select('id, created_at, operador, operador_nome, valor_total, valor_juros, forma_pagamento, maquininha_nome, parcelas, taxa_aplicada')
        .eq('empresa_id', empresaId)
        .gte('created_at', inicio.toISOString())
        .lt('created_at', fim.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('PDV-VS: Erro ao carregar faturamento diário dos operadores:', error);
        container.innerHTML = `<p class="text-sm text-rose-400">Não foi possível carregar o faturamento dos operadores: ${escaparTextoHtml(error.message)}</p>`;
        return;
    }

    const grupos = new Map();
    (vendas || []).forEach(venda => {
        const nome = venda.operador_nome || venda.operador || 'Operador não identificado';
        const grupo = grupos.get(nome) || { total: 0, juros: 0, vendas: [] };
        grupo.total += Number(venda.valor_total) || 0;
        grupo.juros += Number(venda.valor_juros) || 0;
        grupo.vendas.push(venda);
        grupos.set(nome, grupo);
    });

    if (!grupos.size) {
        container.innerHTML = '<p class="text-sm text-gray-500">Nenhuma venda registrada hoje.</p>';
        return;
    }

    container.innerHTML = [...grupos.entries()].map(([nome, grupo]) => `
        <details class="rounded-xl border border-gray-700 bg-gray-900/70">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-gray-800/70">
                <span class="min-w-0">
                    <strong class="block truncate text-sm text-white">${escaparTextoHtml(nome)}</strong>
                    <span class="text-xs text-gray-400">${grupo.vendas.length} venda(s) no dia</span>
                </span>
                <span class="text-right shrink-0">
                    <strong class="block text-sm text-emerald-300">${formatarDinheiro(grupo.total)}</strong>
                    <span class="text-[11px] text-amber-300">Juros ${formatarDinheiro(grupo.juros)}</span>
                </span>
            </summary>
            <div class="space-y-2 border-t border-gray-700 p-3">
                ${grupo.vendas.map(venda => {
                    const infoMaquininha = venda.maquininha_nome ? ' · ' + escaparTextoHtml(venda.maquininha_nome) : '';
                    const infoParcelas = venda.parcelas ? ' · ' + venda.parcelas + 'x' : '';
                    const infoTaxa = venda.taxa_aplicada != null ? ' · ' + Number(venda.taxa_aplicada).toFixed(2) + '%' : '';

                    return `
                        <article class="rounded-lg bg-gray-950/70 p-3 text-xs">
                            <div class="flex flex-wrap justify-between gap-2">
                                <span class="text-gray-400">${venda.created_at ? new Date(venda.created_at).toLocaleTimeString('pt-BR') : '--'}</span>
                                <strong class="text-emerald-300">${formatarDinheiro(venda.valor_total)}</strong>
                            </div>
                            <p class="mt-1 text-gray-300">${escaparTextoHtml(venda.forma_pagamento || 'Forma não informada')}${infoMaquininha}${infoParcelas}</p>
                            <p class="mt-1 text-amber-300">Juros: ${formatarDinheiro(venda.valor_juros)}${infoTaxa}</p>
                        </article>
                    `;
                }).join('')}
            </div>
        </details>
    `).join('');
}