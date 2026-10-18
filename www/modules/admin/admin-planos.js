import { adminSupabase as supabase } from '../../core/config.js';

const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

export async function initAdminPlanos(container) {
    container.innerHTML = `
        <div class="space-y-5">
            <header>
                <h2 class="text-lg font-bold text-white">Planos e assinatura</h2>
                <p class="mt-1 text-xs text-gray-400">Limites, situação atual e contratação segura pelo Asaas.</p>
            </header>
            <p id="status-asaas" class="rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300" role="status">Verificando configuração de pagamentos...</p>
            <div id="plano-atual" class="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">Carregando assinatura...</div>
            <div id="lista-planos" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <p class="text-sm text-gray-400">Carregando planos...</p>
            </div>
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

    if (plansError) throw plansError;
    if (entitlementError) throw entitlementError;

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

    document.getElementById('plano-atual').textContent =
        `Plano ${entitlement?.nome || 'Grátis'} · situação ${entitlement?.status_assinatura || 'ATIVO'}`;

    const lista = document.getElementById('lista-planos');
    lista.innerHTML = (plans || []).map(plan => {
        const limites = [
            `${plan.limite_operadores} operador(es) adicional(is)`,
            `${plan.limite_dispositivos} dispositivo(s)`,
            `${Number(plan.limite_produtos).toLocaleString('pt-BR')} produtos`,
            plan.dias_historico == null ? 'Histórico ilimitado' : `Histórico de ${plan.dias_historico} dias`,
            plan.limite_notas_mensais == null ? 'Fiscal conforme cota da API' : `${plan.limite_notas_mensais} nota(s) fiscais/mês`
        ];
        const atual = plan.id === entitlement?.plano_id;
        return `
            <article class="flex flex-col rounded-xl border ${atual ? 'border-emerald-500 bg-emerald-950/20' : 'border-gray-700 bg-gray-900/60'} p-4">
                <div class="flex items-start justify-between gap-2">
                    <h3 class="text-base font-bold text-white">${plan.nome}</h3>
                    ${atual ? '<span class="rounded-full bg-emerald-900 px-2 py-1 text-[10px] font-bold text-emerald-300">ATUAL</span>' : ''}
                </div>
                <p class="mt-2 text-xl font-black text-emerald-300">${formatarMoeda(plan.preco_mensal)}<span class="text-xs font-medium text-gray-400">/mês</span></p>
                <ul class="my-4 flex-1 space-y-2 text-xs text-gray-300">
                    ${limites.map(item => `<li><i class="fa-solid fa-check mr-2 text-emerald-400"></i>${item}</li>`).join('')}
                </ul>
                ${Number(plan.preco_mensal) === 0
                    ? '<span class="text-center text-xs text-gray-500">Plano gratuito</span>'
                    : `<div class="space-y-2">
                        <button data-plan="${plan.id}" data-method="PIX" type="button" class="btn-assinar w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">Assinar com PIX</button>
                        <button data-plan="${plan.id}" data-method="CREDIT_CARD" type="button" class="btn-assinar-cartao w-full rounded-lg border border-gray-600 px-3 py-2.5 text-xs font-bold text-gray-200 hover:border-emerald-500">Assinar com Cartão</button>
                    </div>`
                }
            </article>
        `;
    }).join('');

    lista.querySelectorAll('.btn-assinar').forEach(button => {
        button.addEventListener('click', () => void assinar(button.dataset.plan, 'PIX'));
    });
    lista.querySelectorAll('.btn-assinar-cartao').forEach(button => {
        button.addEventListener('click', () => {
            mostrarStatus('O pagamento recorrente com cartão requer o token seguro gerado pelo SDK oficial do Asaas. Os dados completos do cartão não devem ser inseridos nem enviados pelo PDV.', false);
        });
    });
}

async function assinar(planId, billingType) {
    const botoes = [...document.querySelectorAll('.btn-assinar')];
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
        mostrarStatus(error.message || 'Não foi possível iniciar a assinatura.', false);
    } finally {
        botoes.forEach(button => { button.disabled = false; });
    }
}

function mostrarStatus(mensagem, sucesso, paymentUrl = null) {
    const status = document.getElementById('status-assinatura');
    if (!status) return;
    status.replaceChildren(document.createTextNode(mensagem));
    if (paymentUrl) {
        try {
            const url = new URL(paymentUrl);
            if (url.protocol === 'https:' && ['www.asaas.com', 'sandbox.asaas.com'].includes(url.hostname)) {
                const link = document.createElement('a');
                link.href = url.href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'mt-2 block font-bold underline';
                link.textContent = 'Abrir cobrança e concluir o pagamento';
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
