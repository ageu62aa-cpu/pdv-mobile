import { adminSupabase as supabase } from '../../core/config.js';

const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});
const ordemPlanos = ['gratis', 'bronze', 'prata', 'ouro', 'diamante'];
const catalogoPlanos = [
    { id: 'gratis', nome: 'Grátis', preco_mensal: 0, limite_operadores: 0, limite_dispositivos: 1, limite_produtos: 100, dias_historico: 7, limite_notas_mensais: 0, icone: 'fa-gift', borda: 'border-gray-700' },
    { id: 'bronze', nome: 'Bronze', preco_mensal: 29.99, limite_operadores: 1, limite_dispositivos: 2, limite_produtos: 1000, dias_historico: 30, limite_notas_mensais: 50, icone: 'fa-medal', borda: 'border-amber-700' },
    { id: 'prata', nome: 'Prata', preco_mensal: 49.99, limite_operadores: 3, limite_dispositivos: 4, limite_produtos: 3000, dias_historico: 90, limite_notas_mensais: 200, icone: 'fa-medal', borda: 'border-slate-500' },
    { id: 'ouro', nome: 'Ouro', preco_mensal: 59.99, limite_operadores: 5, limite_dispositivos: 6, limite_produtos: 5000, dias_historico: 365, limite_notas_mensais: 500, icone: 'fa-medal', borda: 'border-yellow-700' },
    { id: 'diamante', nome: 'Diamante', preco_mensal: 99.99, limite_operadores: 10, limite_dispositivos: 12, limite_produtos: 10000, dias_historico: null, limite_notas_mensais: null, icone: 'fa-gem', borda: 'border-cyan-700' }
];

export async function initAdminPlanos(container) {
    container.innerHTML = `
        <div class="space-y-5">
            <header>
                <h2 class="text-lg font-bold text-white">Planos e assinatura</h2>
                <p class="mt-1 text-xs text-gray-400">Limites, situação atual e contratação segura pelo Asaas.</p>
            </header>
            <p id="status-asaas" class="rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300" role="status">Verificando configuração de pagamentos...</p>
            <div id="plano-atual" class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">Carregando assinatura...</div>
            <p class="text-[11px] text-gray-500 sm:hidden">Deslize os cartões para comparar todos os planos.</p>
            <div id="status-catalogo" class="hidden rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200" role="status"></div>
            <div id="lista-planos" class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:grid sm:w-full sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-3">
                <p class="text-sm text-gray-400">Carregando planos...</p>
            </div>
            <p class="text-[11px] leading-relaxed text-gray-500">* A emissão fiscal depende de integração fiscal ativa e da cota disponível na API contratada.</p>
            <p id="status-assinatura" class="hidden rounded-lg p-3 text-xs" role="status"></p>
        </div>
    `;

    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar os planos.');

    const [{ data: plans, error: plansError }, { data: entitlement, error: entitlementError }, paymentStatus] =
        await Promise.all([
            supabase.from('planos').select('*').order('preco_mensal'),
            supabase.rpc('vancely_get_tenant_entitlements', { p_empresa_id: empresaId }).maybeSingle(),
            supabase.functions.invoke('asaas', { body: { action: 'status' } })
        ]);

    if (plansError) {
        console.error('Não foi possível carregar os planos cadastrados:', plansError);
    }
    if (entitlementError) {
        console.error('Não foi possível consultar o plano atual:', entitlementError);
    }

    const statusAsaas = document.getElementById('status-asaas');
    if (paymentStatus.error) {
        console.error('Não foi possível verificar a configuração do Asaas:', paymentStatus.error);
        statusAsaas.textContent = 'Não foi possível verificar pagamentos. Confirme se a Edge Function do Asaas foi publicada e configure as chaves do servidor.';
        statusAsaas.className = 'rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200';
    } else if (!paymentStatus.data?.configured) {
        statusAsaas.textContent = paymentStatus.data?.message
            || 'A integração de pagamentos aguarda a configuração das chaves do Asaas no ambiente seguro do servidor.';
        statusAsaas.className = 'rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200';
    } else {
        statusAsaas.textContent = 'Pagamentos pelo Asaas configurados.';
        statusAsaas.className = 'rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-200';
    }

    const planoAtual = document.getElementById('plano-atual');
    if (entitlementError) {
        planoAtual.textContent = 'Não foi possível consultar o plano e a assinatura atuais.';
        planoAtual.className = 'rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200';
    } else {
        planoAtual.textContent =
            `Plano ${entitlement?.nome || 'Grátis'} · situação ${entitlement?.status_assinatura || 'ATIVO'}`;
    }

    const lista = document.getElementById('lista-planos');
    const planoAtualId = entitlement?.plano_id || (entitlementError ? null : 'gratis');
    const indicePlanoAtual = ordemPlanos.indexOf(planoAtualId);
    const planosDoBanco = new Map((plans || []).map(plan => [plan.id, plan]));
    const statusCatalogo = document.getElementById('status-catalogo');
    if (plansError || entitlementError || catalogoPlanos.some(plan => !planosDoBanco.has(plan.id))) {
        statusCatalogo.textContent = 'Os cinco planos estão visíveis. Para contratar, confirme se o catálogo foi aplicado no Supabase e se os pagamentos estão configurados.';
        statusCatalogo.classList.remove('hidden');
    }

    const planosExibidos = catalogoPlanos.map(planoPadrao => ({
        ...planoPadrao,
        ...planosDoBanco.get(planoPadrao.id),
        nome: planoPadrao.nome
    }));
    lista.innerHTML = planosExibidos.map(plan => {
        const limites = [
            ['fa-users', 'Operadores', `${plan.limite_operadores} extra(s) + 1 admin`],
            ['fa-box', 'Produtos', Number(plan.limite_produtos).toLocaleString('pt-BR')],
            ['fa-clock', 'Histórico', plan.dias_historico == null ? 'Ilimitado' : `${plan.dias_historico} dias`],
            ['fa-file-invoice', 'Notas fiscais', plan.limite_notas_mensais == null ? 'Ilimitado*' : `${plan.limite_notas_mensais}/mês`],
            ['fa-mobile-screen-button', 'Dispositivos', String(plan.limite_dispositivos)]
        ];
        const atual = plan.id === planoAtualId;
        const superior = ordemPlanos.indexOf(plan.id) > indicePlanoAtual;
        return `
            <article class="plan-card flex w-[84vw] max-w-[20rem] shrink-0 snap-start flex-col rounded-2xl border ${atual ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/40 to-gray-900 ring-1 ring-emerald-500/30' : `${plan.borda} bg-gray-900/70`} p-4 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-gray-800/90 sm:w-auto">
                <div class="flex min-h-10 items-center justify-between gap-2">
                    <h3 class="flex min-w-0 items-center gap-2 text-base font-bold text-white">
                        <span class="plan-tier-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" data-plan-tier="${plan.id}" aria-hidden="true"><i class="fa-solid ${plan.icone}"></i></span>
                        <span>${plan.nome}</span>
                    </h3>
                    ${atual ? '<span class="shrink-0 rounded-full bg-emerald-900/80 px-2 py-1 text-[10px] font-bold text-emerald-300">Plano atual</span>' : ''}
                </div>
                <p class="mt-3 border-b border-gray-700/80 pb-3 text-2xl font-black tracking-tight text-emerald-300">${formatarMoeda(plan.preco_mensal)}<span class="ml-1 text-xs font-medium text-gray-400">/ mês</span></p>
                <ul class="my-2 flex-1 divide-y divide-gray-700/60 text-xs text-gray-300">
                    ${limites.map(([icone, rotulo, valor]) => `<li class="flex min-h-10 items-center justify-between gap-2 py-1.5"><span class="flex min-w-0 items-center gap-2 text-gray-400"><i class="fa-solid ${icone} w-4 shrink-0 text-center text-gray-500" aria-hidden="true"></i><span>${rotulo}</span></span><strong class="max-w-[58%] text-right font-semibold leading-tight text-gray-100">${valor}</strong></li>`).join('')}
                </ul>
                ${atual
                    ? '<span class="mt-2 rounded-xl bg-emerald-950/60 px-3 py-2.5 text-center text-xs font-bold text-emerald-300">Você está neste plano</span>'
                    : superior
                        ? `<div class="space-y-2">
                        <button data-plan="${plan.id}" data-method="PIX" type="button" class="btn-assinar w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500">${Number(plan.preco_mensal) === 0 ? 'Selecionar plano' : 'Fazer upgrade'}</button>
                        ${Number(plan.preco_mensal) > 0 ? `
                        <button data-plan="${plan.id}" data-method="CREDIT_CARD" type="button" class="btn-assinar-cartao w-full rounded-xl border border-gray-600 px-3 py-2.5 text-xs font-bold text-gray-200 transition hover:border-emerald-500">Assinar com cartão</button>
                        ` : ''}
                    </div>`
                        : '<span class="mt-2 rounded-xl border border-gray-700 px-3 py-2.5 text-center text-xs text-gray-500">Plano abaixo do atual</span>'}
            </article>
        `;
    }).join('');

    lista.querySelectorAll('.btn-assinar').forEach(button => {
        button.addEventListener('click', () => void assinar(button.dataset.plan, 'PIX'));
    });
    lista.querySelectorAll('.btn-assinar-cartao').forEach(button => {
        button.addEventListener('click', () => void assinar(button.dataset.plan, 'CREDIT_CARD'));
    });
}

async function assinar(planId, billingType) {
    const botoes = [...document.querySelectorAll('.btn-assinar, .btn-assinar-cartao')];
    botoes.forEach(button => { button.disabled = true; });
    try {
        const { data, error } = await supabase.functions.invoke('asaas', {
            body: { action: 'subscribe', planId, billingType }
        });
        if (error) throw error;
        if (!data?.configured) {
            mostrarStatus(data?.message || 'A integração do Asaas ainda não está configurada.', false);
            return;
        }
        mostrarStatus(data.message || 'Assinatura enviada ao Asaas. O plano será ativado após confirmação do pagamento.', true, data.paymentUrl);
    } catch (error) {
        console.error('Não foi possível criar a assinatura no Asaas:', error);
        mostrarStatus(await obterMensagemErro(error), false);
    } finally {
        botoes.forEach(button => { button.disabled = false; });
    }
}

async function obterMensagemErro(error) {
    const resposta = error?.context;
    if (resposta && typeof resposta.clone === 'function' && typeof resposta.status === 'number') {
        try {
            const corpo = await resposta.clone().json();
            const mensagem = typeof corpo?.error === 'string'
                ? corpo.error
                : typeof corpo?.message === 'string' ? corpo.message : '';
            if (mensagem) return `${mensagem} (HTTP ${resposta.status})`;
        } catch {
            // Keep the SDK error when the function response is not JSON.
        }
        return `${error?.message || 'A Edge Function recusou a solicitação.'} (HTTP ${resposta.status})`;
    }
    return error?.message || 'Não foi possível iniciar a assinatura.';
}

function mostrarStatus(mensagem, sucesso, paymentUrl = null) {
    const status = document.getElementById('status-assinatura');
    if (!status) return;
    status.replaceChildren(document.createTextNode(mensagem));
    if (paymentUrl) {
        try {
            const url = new URL(paymentUrl);
            if (url.protocol === 'https:' && ['asaas.com', 'www.asaas.com', 'sandbox.asaas.com'].includes(url.hostname)) {
                const link = document.createElement('a');
                link.href = url.href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'mt-2 block font-bold underline';
                link.textContent = 'Abrir checkout seguro do Asaas';
                status.append(document.createElement('br'), link);
            }
        } catch (error) {
            console.error('URL de cobrança retornada pelo Asaas é inválida:', error);
        }
    }
    status.className = `rounded-lg border p-3 text-xs ${sucesso
        ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200'
        : 'border-amber-800 bg-amber-950/40 text-amber-200'}`;
}
