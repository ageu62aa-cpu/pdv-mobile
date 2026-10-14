/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Exibe o nome real do operador (comissões/F2) com terminais fixos #01 e #02.
 */
import { supabase } from '../../core/config.js';

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
                        <span>Gestão de Operadores e Caixas</span>
                    </h2>
                    <p class="text-xs text-gray-400 mt-0.5">Acompanhe o status de abertura, faturamento diário e terminais em tempo real.</p>
                </div>
                <button onclick="window.carregarGestaoOperadores()" class="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-2 rounded-lg border border-gray-700 transition flex items-center gap-1.5">
                    <i class="fa-solid fa-rotate-right"></i> Atualizar Dados
                </button>
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

    window.carregarGestaoOperadores = carregarGestaoOperadores;
    await carregarGestaoOperadores();
}

async function carregarGestaoOperadores() {
    const gridContainer = document.getElementById('grid-operadores-container');
    if (!gridContainer) return;
    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar o status dos caixas.');

    // 1. Buscamos caixas, perfis e a tabela de operadores em paralelo
    const [
        { data: caixas, error: erroCaixas },
        { data: perfis, error: erroPerfis },
        { data: operadoresTabela, error: erroOpTabela }
    ] = await Promise.all([
        supabase.from('caixas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('usuarios_empresas').select('user_id, cargo').eq('empresa_id', empresaId),
        supabase.from('operadores').select('*').eq('empresa_id', empresaId)
    ]);

    if (erroCaixas) console.error('PDV-VS: Erro ao carregar caixas:', erroCaixas);
    if (erroPerfis) console.error('PDV-VS: Erro ao carregar perfis da empresa:', erroPerfis);
    if (erroOpTabela) console.error('PDV-VS: Erro ao carregar operadores:', erroOpTabela);

    if (erroCaixas || erroPerfis) {
        const erro = erroCaixas || erroPerfis;
        gridContainer.innerHTML = `<div class="col-span-2 text-center py-8 text-red-400 text-sm">Erro ao carregar status dos caixas. ${escaparTextoHtml(erro.message)}</div>`;
        await carregarFaturamentoOperadoresHoje(empresaId);
        return;
    }

    const perfisDaEmpresa = (perfis || []).filter(perfil =>
        perfil.cargo === 'admin_mercado' || perfil.cargo === 'operador'
    );
    const usuarioAtual = window.usuarioAtual;
    if (usuarioAtual?.id
        && !perfisDaEmpresa.some(perfil => perfil.user_id === usuarioAtual.id)
        && window.cargoUsuarioAtual === 'admin_mercado') {
        perfisDaEmpresa.push({ user_id: usuarioAtual.id, cargo: 'admin_mercado' });
    }

    // 2. Garantimos que qualquer operador da tabela 'operadores' apareça no painel
    const idsPerfis = new Set(perfisDaEmpresa.map(p => p.user_id));
    (operadoresTabela || []).forEach(op => {
        if ((op.id && !idsPerfis.has(op.id)) || (op.user_id && !idsPerfis.has(op.user_id))) {
            perfisDaEmpresa.push({ 
                user_id: op.id || op.user_id, 
                cargo: 'operador', 
                nome_extra: op.nome 
            });
        }
    });

    if (perfisDaEmpresa.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
                <i class="fa-solid fa-users-slash text-3xl text-gray-600 mb-2"></i>
                <p class="text-sm">Nenhum administrador ou operador vinculado a esta empresa.</p>
            </div>`;
        await carregarFaturamentoOperadoresHoje(empresaId);
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

    perfisDaEmpresa.sort((a, b) => Number(b.cargo === 'admin_mercado') - Number(a.cargo === 'admin_mercado'));
    let numeroOperadores = 1;
    
    gridContainer.innerHTML = perfisDaEmpresa.map(perfil => {
        const isAdmin = perfil.cargo === 'admin_mercado';
        if (!isAdmin) numeroOperadores += 1;
        
        const caixa = caixaMaisRecentePorUsuario.get(perfil.user_id);
        const isOpen = String(caixa?.status || '').toUpperCase() === 'ABERTO';
        const faturamento = Number(caixa?.faturamento_dia || 0).toFixed(2);
        const valorTroco = Number(caixa?.valor_abertura || 0).toFixed(2);
        const sangrias = Number(caixa?.sangrias || 0);
        const terminalNumero = isAdmin ? '#01' : `#${String(numeroOperadores).padStart(2, '0')}`;
        const tipoPerfil = isAdmin ? 'Administrador' : 'Operador';
        
        const nomeExibicao = isAdmin
            ? (perfil.user_id === usuarioAtual?.id ? 'Administrador (você)' : 'Administrador')
            : (perfil.nome_extra || caixa?.operador_nome || caixa?.vendedor_nome || caixa?.nome_operador || 'Operador');

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
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-400">
                    <span>Terminal / Caixa: <strong class="text-emerald-400">${terminalNumero}</strong></span>
                    <span class="text-[11px] text-gray-500">${caixa ? 'Tempo real' : 'Sem sessão registrada'}</span>
                </div>
            </div>
        `;
    }).join('');

    await carregarFaturamentoOperadoresHoje(empresaId);
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
                <span class="shrink-0 text-right">
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