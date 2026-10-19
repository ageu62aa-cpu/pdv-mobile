/**
 * Histórico detalhado de vendas e resumo diário exclusivo do painel administrativo.
 */

import { adminSupabase as supabase } from '../../core/config.js';
import { abrirModalUpgrade } from './admin-upgrade.js';

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

function mesmoDiaLocal(dataA, dataB) {
    return dataA.getFullYear() === dataB.getFullYear()
        && dataA.getMonth() === dataB.getMonth()
        && dataA.getDate() === dataB.getDate();
}

function obterNomeOperador(venda) {
    return venda.operador_nome || venda.operador || 'Operador não identificado';
}

function obterFormaDetalhada(venda) {
    const forma = venda.forma_pagamento || 'Forma não informada';
    const maquina = venda.maquininha_nome ? ` · ${venda.maquininha_nome}` : '';
    return `${forma}${maquina}`;
}

function renderizarDetalhesVenda(venda) {
    const subtotal = Number(venda.valor_subtotal ?? (Number(venda.valor_total || 0) + Number(venda.desconto || 0)));
    const desconto = Number(venda.desconto) || 0;
    const juros = Number(venda.valor_juros) || 0;
    const itens = Array.isArray(venda.itens) ? venda.itens : [];
    const detalhesItens = itens.length
        ? `<ul class="mt-2 space-y-1 text-xs text-gray-400">${itens.map(item => `
            <li>${escaparTextoHtml(item.nome || 'Produto')} · ${Number(item.qtd || 0)} × ${formatarDinheiro(item.preco_venda ?? item.preco)} = ${formatarDinheiro((Number(item.qtd) || 0) * Number(item.preco_venda ?? item.preco ?? 0))}</li>
        `).join('')}</ul>`
        : '<p class="mt-2 text-xs text-gray-500">Itens não disponíveis para esta venda.</p>';
    const detalhesCartao = venda.maquininha_nome
        ? `<p class="mt-1 text-xs text-gray-400">Maquininha: ${escaparTextoHtml(venda.maquininha_nome)}${venda.parcelas ? ` · ${venda.parcelas}x` : ''}${venda.taxa_aplicada != null ? ` · Taxa ${Number(venda.taxa_aplicada).toFixed(2)}%` : ''}</p>`
        : '';

    return `
        <div class="sale-detail-summary rounded-lg bg-gray-950/70 p-3">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <span class="text-gray-400">Subtotal: <strong class="text-gray-200">${formatarDinheiro(subtotal)}</strong></span>
                <span class="text-gray-400">Desconto: <strong class="text-gray-200">${formatarDinheiro(desconto)}</strong></span>
                <span class="text-gray-400">Juros: <strong class="text-amber-300">${formatarDinheiro(juros)}</strong></span>
                <span class="text-gray-400">Total final: <strong class="text-emerald-300">${formatarDinheiro(venda.valor_total)}</strong></span>
            </div>
            <p class="mt-2 text-xs text-gray-300">Pagamento: ${escaparTextoHtml(obterFormaDetalhada(venda))}</p>
            ${detalhesCartao}
            ${detalhesItens}
        </div>
    `;
}

export async function initAdminHistorico(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 class="text-lg font-bold text-white">Faturamento e Histórico de Vendas</h2>
                    <p class="theme-commission-description text-xs text-gray-400">Resumo diário administrativo, vendas por operador/comissão e detalhes de cada pagamento.</p>
                </div>
                <button id="btn-atualizar-historico" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow">
                    Atualizar dados
                </button>
            </div>

            <section id="resumo-faturamento-admin" class="rounded-xl border border-emerald-800/70 bg-gray-900/70 p-4">
                <h3 class="text-sm font-bold text-emerald-300">Faturamento de hoje · visão administrativa</h3>
                <p id="total-faturamento-admin" class="mt-1 text-2xl font-black text-white">Carregando...</p>
                <div id="formas-pagamento-admin" class="mt-3 flex flex-wrap gap-2"></div>
            </section>

            <section class="space-y-3">
                <div>
                    <h3 class="text-sm font-bold text-white">Faturamento diário por operador / comissão (F2)</h3>
                    <p class="theme-commission-description text-xs text-gray-400">Clique em um operador para expandir as vendas do dia, formas de pagamento e juros.</p>
                </div>
                <div id="resumo-operadores-dia" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <p class="text-sm text-gray-400">Carregando resumo dos operadores...</p>
                </div>
            </section>

            <section class="space-y-3">
                <h3 class="text-sm font-bold text-white">Histórico completo</h3>
                <div id="banner-upgrade-historico" class="hidden items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4">
                    <p id="mensagem-upgrade-historico" class="text-xs leading-5 text-amber-100"></p>
                    <button id="btn-desbloquear-historico-topo" type="button" class="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-gray-950 hover:bg-amber-400">Desbloquear Agora</button>
                </div>
                <p id="aviso-limite-historico" class="hidden text-xs text-amber-300"></p>
                <div class="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800">
                    <table class="w-full min-w-[760px] text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-gray-900 border-b border-gray-700 text-xs text-gray-400 uppercase">
                                <th class="p-3">Data / Hora</th>
                                <th class="p-3">Operador / Forma de pagamento</th>
                                <th class="p-3">Juros</th>
                                <th class="p-3">Total final</th>
                                <th class="p-3">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody id="tabela-historico-corpo" class="divide-y divide-gray-700">
                            <tr><td colspan="5" class="text-center p-6 text-gray-400">Carregando histórico...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="paywall-historico" class="hidden rounded-xl border border-amber-500/40 bg-amber-950/30 p-5 text-center">
                    <p class="text-sm font-bold text-amber-200">Parte do histórico está bloqueada pelo seu plano.</p>
                    <p id="total-historico-bloqueado" class="mt-1 text-xs text-amber-100/70"></p>
                    <button id="btn-upgrade-historico" type="button" class="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-gray-950 hover:bg-amber-400">
                        Faça Upgrade para desbloquear o histórico completo
                    </button>
                </div>
            </section>
        </div>
    `;

    const abrirUpgradeHistorico = () => abrirModalUpgrade('Faça upgrade do seu plano para consultar o histórico de vendas completo e acessar períodos anteriores.');
    containerEl.querySelector('#btn-atualizar-historico').addEventListener('click', carregarHistorico);
    containerEl.querySelector('#btn-desbloquear-historico-topo').addEventListener('click', abrirUpgradeHistorico);
    containerEl.querySelector('#btn-upgrade-historico').addEventListener('click', abrirUpgradeHistorico);
    await carregarHistorico();
}

async function carregarHistorico() {
    const tbody = document.getElementById('tabela-historico-corpo');
    const totalAdmin = document.getElementById('total-faturamento-admin');
    const formasAdmin = document.getElementById('formas-pagamento-admin');
    const resumoOperadores = document.getElementById('resumo-operadores-dia');
    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar o histórico.');

    const { data: plano, error: erroPlano } = await supabase
        .rpc('vancely_get_tenant_entitlements', { p_empresa_id: empresaId })
        .maybeSingle();
    if (erroPlano) throw erroPlano;

    const corte = plano?.dias_historico == null
        ? null
        : new Date(Date.now() - Number(plano.dias_historico) * 24 * 60 * 60 * 1000);
    let consultaVendas = supabase
        .from('vendas')
        .select('id, created_at, operador, operador_nome, valor_total, valor_subtotal, valor_juros, desconto, forma_pagamento, parcelas, maquininha_nome, taxa_aplicada, cliente_cpf, itens')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
    if (corte) consultaVendas = consultaVendas.gte('created_at', corte.toISOString());

    const { data, error } = await consultaVendas;
    if (error) {
        console.error('PDV-VS: Erro ao carregar vendas da empresa:', error);
        const mensagem = escaparTextoHtml(error.message);
        totalAdmin.textContent = 'Não foi possível carregar';
        formasAdmin.innerHTML = `<span class="text-xs text-rose-400">${mensagem}</span>`;
        resumoOperadores.innerHTML = `<p class="text-sm text-rose-400">${mensagem}</p>`;
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-rose-400 text-xs">Erro ao carregar vendas: ${mensagem}</td></tr>`;
        return;
    }

    const vendas = data || [];
    let vendasBloqueadas = 0;
    if (corte) {
        const { count, error: erroBloqueadas } = await supabase
            .from('vendas')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .lt('created_at', corte.toISOString());
        if (erroBloqueadas) throw erroBloqueadas;
        vendasBloqueadas = count || 0;
    }
    const avisoLimite = document.getElementById('aviso-limite-historico');
    const bannerUpgrade = document.getElementById('banner-upgrade-historico');
    if (corte && avisoLimite) {
        avisoLimite.textContent = `O plano ${plano?.nome || ''} permite visualizar os últimos ${plano.dias_historico} dias.`;
        avisoLimite.classList.remove('hidden');
        bannerUpgrade.classList.remove('hidden');
        bannerUpgrade.classList.add('flex');
        document.getElementById('mensagem-upgrade-historico').textContent =
            `Visualizando os últimos ${plano.dias_historico} dias do seu plano. Quer consultar o histórico completo?`;
    } else {
        avisoLimite?.classList.add('hidden');
        bannerUpgrade?.classList.add('hidden');
        bannerUpgrade?.classList.remove('flex');
    }
    const paywall = document.getElementById('paywall-historico');
    let registrosBloqueadosHtml = '';
    if (vendasBloqueadas > 0) {
        const registrosFoscos = Math.min(vendasBloqueadas, 5);
        registrosBloqueadosHtml = Array.from({ length: registrosFoscos }, () => `
            <tr aria-hidden="true" class="select-none">
                <td colspan="5" class="p-3">
                    <div class="pointer-events-none blur-sm opacity-50">
                        <div class="h-3 w-1/3 rounded bg-gray-500"></div>
                        <div class="mt-2 h-3 w-2/3 rounded bg-gray-600"></div>
                    </div>
                </td>
            </tr>
        `).join('');
        document.getElementById('total-historico-bloqueado').textContent =
            `${vendasBloqueadas.toLocaleString('pt-BR')} venda(s) anterior(es) ao período incluído.`;
        paywall.classList.remove('hidden');
    } else {
        paywall.classList.add('hidden');
    }

    const hoje = new Date();
    const vendasHoje = vendas.filter(venda => venda.created_at && mesmoDiaLocal(new Date(venda.created_at), hoje));
    const totalDia = vendasHoje.reduce((total, venda) => total + (Number(venda.valor_total) || 0), 0);
    totalAdmin.textContent = `${formatarDinheiro(totalDia)} · ${vendasHoje.length} venda(s)`;

    const formasPagamento = new Map();
    vendasHoje.forEach(venda => {
        const forma = obterFormaDetalhada(venda);
        formasPagamento.set(forma, (formasPagamento.get(forma) || 0) + (Number(venda.valor_total) || 0));
    });
    formasAdmin.innerHTML = formasPagamento.size
        ? [...formasPagamento.entries()].map(([forma, total]) => `
            <span class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300">
                ${escaparTextoHtml(forma)}: <strong class="text-emerald-300">${formatarDinheiro(total)}</strong>
            </span>
        `).join('')
        : '<span class="text-xs text-gray-500">Nenhuma venda registrada hoje.</span>';

    const operadores = new Map();
    vendasHoje.forEach(venda => {
        const nome = obterNomeOperador(venda);
        const grupo = operadores.get(nome) || { total: 0, juros: 0, vendas: [] };
        grupo.total += Number(venda.valor_total) || 0;
        grupo.juros += Number(venda.valor_juros) || 0;
        grupo.vendas.push(venda);
        operadores.set(nome, grupo);
    });
    resumoOperadores.innerHTML = operadores.size
        ? [...operadores.entries()].map(([nome, grupo]) => `
            <details class="group rounded-xl border border-gray-700 bg-gray-900/70">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-gray-800/70">
                    <span class="min-w-0">
                        <strong class="block truncate text-sm text-white">${escaparTextoHtml(nome)}</strong>
                        <span class="theme-commission-description text-xs text-gray-400">${grupo.vendas.length} venda(s) · Comissão identificada pelo F2</span>
                    </span>
                    <span class="shrink-0 text-right">
                        <strong class="block text-sm text-emerald-300">${formatarDinheiro(grupo.total)}</strong>
                        <span class="text-[11px] text-amber-300">Juros ${formatarDinheiro(grupo.juros)}</span>
                    </span>
                </summary>
                <div class="space-y-2 border-t border-gray-700 p-3">
                    ${grupo.vendas.map(venda => `
                        <div>
                            <p class="mb-1 text-[11px] text-gray-500">${venda.created_at ? new Date(venda.created_at).toLocaleTimeString('pt-BR') : '--'} · ${formatarDinheiro(venda.valor_total)}</p>
                            ${renderizarDetalhesVenda(venda)}
                        </div>
                    `).join('')}
                </div>
            </details>
        `).join('')
        : '<p class="text-sm text-gray-500">Nenhum operador registrou vendas hoje.</p>';

    if (vendas.length === 0) {
        tbody.innerHTML = vendasBloqueadas > 0
            ? registrosBloqueadosHtml
            : '<tr><td colspan="5" class="text-center p-6 text-gray-400">Nenhuma venda registrada.</td></tr>';
        return;
    }

    tbody.innerHTML = vendas.map(venda => `
        <tr class="align-top hover:bg-gray-750 transition-colors">
            <td class="p-3 text-gray-300 text-xs">${venda.created_at ? new Date(venda.created_at).toLocaleString('pt-BR') : '--'}</td>
            <td class="p-3 text-xs">
                <strong class="text-white">${escaparTextoHtml(obterNomeOperador(venda))}</strong>
                <p class="mt-1 text-gray-400">${escaparTextoHtml(obterFormaDetalhada(venda))}</p>
            </td>
            <td class="p-3 text-xs text-amber-300">${formatarDinheiro(venda.valor_juros)}</td>
            <td class="p-3 font-bold text-emerald-400">${formatarDinheiro(venda.valor_total)}</td>
            <td class="p-3">
                <details>
                    <summary class="cursor-pointer text-xs font-semibold text-emerald-300">Abrir</summary>
                    <div class="min-w-[340px] pt-2">${renderizarDetalhesVenda(venda)}</div>
                </details>
            </td>
        </tr>
    `).join('') + registrosBloqueadosHtml;
}
