import { adminSupabase as supabase } from '../../core/config.js';

const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});
const ordemPlanos = ['gratis', 'iniciante', 'profissional', 'ouro', 'diamante'];
const catalogoPlanos = [
    { id: 'gratis', nome: 'Grátis', preco_mensal: 0, limite_operadores: 0, limite_dispositivos: 1, limite_produtos: 100, dias_historico: 7, limite_notas_mensais: 0, icone: 'fa-gift', borda: 'border-gray-700' },
    { id: 'iniciante', nome: 'Iniciante', preco_mensal: 29.99, limite_operadores: 1, limite_dispositivos: 2, limite_produtos: 1000, dias_historico: 30, limite_notas_mensais: 50, icone: 'fa-medal', borda: 'border-amber-700' },
    { id: 'profissional', nome: 'Profissional', preco_mensal: 49.99, limite_operadores: 3, limite_dispositivos: 4, limite_produtos: 3000, dias_historico: 90, limite_notas_mensais: 200, icone: 'fa-medal', borda: 'border-slate-500' },
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
        </div>
        <dialog id="modal-upgrade" class="w-[min(94vw,38rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-0 text-gray-100 shadow-2xl backdrop:bg-gray-950/80">
            <form id="form-upgrade" class="space-y-5 p-5 sm:p-6">
                <header class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">Checkout seguro</p>
                        <h3 id="upgrade-titulo" class="mt-1 text-xl font-black text-white">Assinar plano</h3>
                        <p id="upgrade-preco" class="mt-1 text-sm text-gray-400"></p>
                    </div>
                    <button id="fechar-modal-upgrade" type="button" class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white" aria-label="Fechar">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </header>
                <div class="rounded-xl border border-sky-900/70 bg-sky-950/30 p-3 text-xs leading-5 text-sky-100">
                    <i class="fa-solid fa-shield-halved mr-1.5 text-sky-300" aria-hidden="true"></i>
                    O pagamento será concluído no checkout oficial e seguro do Asaas. Os dados do cartão não são armazenados pelo PDV.
                </div>
                <label class="block text-xs font-bold text-gray-300">Forma de pagamento
                    <select name="billingType" id="upgrade-meio-pagamento" required class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        <option value="PIX">Pix</option>
                        <option value="CREDIT_CARD">Cartão de crédito</option>
                    </select>
                </label>
                <section class="space-y-3">
                    <div>
                        <h4 class="text-sm font-bold text-white">Dados para cobrança</h4>
                        <p class="mt-1 text-xs text-gray-400">Complete ou confirme os dados do titular. O endereço é obrigatório para cartão.</p>
                    </div>
                    <label class="block text-xs font-bold text-gray-300">CPF ou CNPJ
                        <input name="cpfCnpj" required inputmode="numeric" maxlength="18" autocomplete="on" class="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                    </label>
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label class="text-xs font-bold text-gray-300 sm:col-span-2">Logradouro
                            <input name="address" maxlength="150" autocomplete="street-address" class="upgrade-address mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Número
                            <input name="addressNumber" maxlength="20" autocomplete="address-line2" class="upgrade-address mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Bairro
                            <input name="province" maxlength="100" autocomplete="address-level3" class="upgrade-address mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">CEP
                            <input name="postalCode" inputmode="numeric" maxlength="9" autocomplete="postal-code" class="upgrade-address mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Cidade
                            <input name="city" maxlength="100" autocomplete="address-level2" class="upgrade-address mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white">
                        </label>
                    </div>
                </section>
                <p id="status-upgrade" class="hidden rounded-lg border p-3 text-xs" role="status"></p>
                <footer class="flex flex-col-reverse gap-2 border-t border-gray-800 pt-4 sm:flex-row sm:justify-end">
                    <button id="cancelar-upgrade" type="button" class="rounded-lg border border-gray-700 px-4 py-2.5 text-xs font-bold text-gray-300 transition hover:bg-gray-800">Cancelar</button>
                    <button id="confirmar-upgrade" type="submit" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-500">
                        <i class="fa-solid fa-lock mr-1.5" aria-hidden="true"></i>Continuar para pagamento
                    </button>
                </footer>
            </form>
        </dialog>
    `;

    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar os planos.');

    const [{ data: plans, error: plansError }, { data: entitlement, error: entitlementError }, paymentStatus, companyProfileResult] =
        await Promise.all([
            supabase.from('planos').select('*').order('preco_mensal'),
            supabase.rpc('vancely_get_tenant_entitlements', { p_empresa_id: empresaId }).maybeSingle(),
            supabase.functions.invoke('asaas', { body: { action: 'status' } }),
            supabase.from('empresas')
                .select('cnpj, endereco, numero, bairro, cep, cidade')
                .eq('id', empresaId)
                .maybeSingle()
        ]);
    if (companyProfileResult.error) {
        console.error('Não foi possível carregar os dados para o upgrade:', companyProfileResult.error);
    }

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
    const planosAusentes = catalogoPlanos
        .filter(plan => !planosDoBanco.has(plan.id))
        .map(plan => plan.nome);
    if (plansError || entitlementError || planosAusentes.length) {
        const causas = [];
        if (plansError) causas.push(`falha ao consultar o catálogo (${plansError.message})`);
        if (entitlementError) causas.push(`falha ao consultar a assinatura (${entitlementError.message})`);
        if (!plansError && planosAusentes.length) causas.push(`planos ausentes no banco: ${planosAusentes.join(', ')}`);
        statusCatalogo.textContent = `O catálogo de planos está incompleto: ${causas.join('; ')}. Aplique as migrations SaaS no Supabase; upgrades ficarão indisponíveis até corrigir.`;
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
                    : superior && !plansError && planosDoBanco.has(plan.id)
                        ? `<button data-plan="${plan.id}" data-plan-name="${plan.nome}" data-plan-price="${Number(plan.preco_mensal)}" type="button" class="btn-assinar mt-2 w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500">${Number(plan.preco_mensal) === 0 ? 'Selecionar plano' : 'Fazer upgrade'}</button>`
                        : planosAusentes.includes(plan.nome) || plansError
                            ? '<span class="mt-2 rounded-xl border border-amber-800 bg-amber-950/30 px-3 py-2.5 text-center text-xs text-amber-200">Indisponível: plano não cadastrado no Supabase</span>'
                            : '<span class="mt-2 rounded-xl border border-gray-700 px-3 py-2.5 text-center text-xs text-gray-500">Plano abaixo do atual</span>'}
            </article>
        `;
    }).join('');

    const modal = document.getElementById('modal-upgrade');
    const form = document.getElementById('form-upgrade');
    const paymentMethod = document.getElementById('upgrade-meio-pagamento');
    const addressFields = [...form.querySelectorAll('.upgrade-address')];
    let selectedPlanId = '';
    const updateAddressRequirements = () => {
        const required = paymentMethod.value === 'CREDIT_CARD';
        addressFields.forEach(field => { field.required = required; });
    };
    const closeModal = () => modal.close();
    document.getElementById('fechar-modal-upgrade').addEventListener('click', closeModal);
    document.getElementById('cancelar-upgrade').addEventListener('click', closeModal);
    paymentMethod.addEventListener('change', updateAddressRequirements);
    Object.entries({
        cpfCnpj: companyProfileResult.data?.cnpj,
        address: companyProfileResult.data?.endereco,
        addressNumber: companyProfileResult.data?.numero,
        province: companyProfileResult.data?.bairro,
        postalCode: companyProfileResult.data?.cep,
        city: companyProfileResult.data?.cidade
    }).forEach(([name, value]) => {
        const input = form.elements.namedItem(name);
        if (input && value) input.value = value;
    });
    updateAddressRequirements();

    lista.querySelectorAll('.btn-assinar').forEach(button => {
        button.addEventListener('click', () => {
            if (Number(button.dataset.planPrice) <= 0) return;
            selectedPlanId = button.dataset.plan;
            document.getElementById('upgrade-titulo').textContent = `Upgrade para ${button.dataset.planName}`;
            document.getElementById('upgrade-preco').textContent = `${formatarMoeda(button.dataset.planPrice)} por mês`;
            document.getElementById('status-upgrade').classList.add('hidden');
            modal.showModal();
        });
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        void assinar(selectedPlanId, new FormData(form));
    });
}

async function assinar(planId, formData) {
    const submitButton = document.getElementById('confirmar-upgrade');
    const status = document.getElementById('status-upgrade');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden="true"></i>Preparando checkout seguro...';
    status.classList.add('hidden');
    try {
        const resultado = await supabase.functions.invoke('asaas', {
            body: {
                action: 'subscribe',
                planId,
                billingType: formData.get('billingType'),
                cpfCnpj: String(formData.get('cpfCnpj') || '').replace(/\D/g, ''),
                address: String(formData.get('address') || '').trim(),
                addressNumber: String(formData.get('addressNumber') || '').trim(),
                province: String(formData.get('province') || '').trim(),
                postalCode: String(formData.get('postalCode') || '').replace(/\D/g, ''),
                city: String(formData.get('city') || '').trim()
            }
        });
        if (resultado.error) throw resultado.error;
        const data = resultado.data;
        if (!data?.configured) {
            status.textContent = data?.message || 'A integração do Asaas ainda não está configurada.';
            status.className = 'rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200';
            status.classList.remove('hidden');
            return;
        }
        if (data.paymentUrl) {
            const url = new URL(data.paymentUrl);
            const hostsAsaas = ['asaas.com', 'www.asaas.com', 'sandbox.asaas.com'];
            if (url.protocol !== 'https:' || !hostsAsaas.includes(url.hostname)) {
                throw new Error('O Asaas retornou um endereço de checkout inválido. Contate o suporte.');
            }
            window.location.assign(url.href);
            return;
        }
        throw new Error('A cobrança foi criada, mas o Asaas não retornou o link de pagamento. Contate o suporte antes de tentar novamente.');
    } catch (error) {
        console.error('Não foi possível criar a assinatura no Asaas:', error);
        const mensagem = await obterMensagemErro(error);
        status.textContent = mensagem;
        status.className = 'rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200';
        status.classList.remove('hidden');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-lock mr-1.5" aria-hidden="true"></i>Continuar para pagamento';
    }
}

async function lerErroFuncao(error) {
    const resposta = error?.context;
    if (resposta && typeof resposta.clone === 'function') {
        try {
            const corpo = await resposta.clone().json();
            return {
                code: typeof corpo?.code === 'string' ? corpo.code : '',
                message: typeof corpo?.error === 'string'
                    ? corpo.error
                    : typeof corpo?.message === 'string'
                        ? corpo.message
                        : typeof corpo?.msg === 'string' ? corpo.msg : '',
                status: resposta.status
            };
        } catch {
            try {
                const message = await resposta.clone().text();
                return { code: '', message, status: resposta.status };
            } catch {
                return { code: '', message: '', status: resposta.status };
            }
        }
    }
    return { code: '', message: error?.message || '', status: null };
}

async function obterMensagemErro(error) {
    const resposta = error?.context;
    if (resposta && typeof resposta.clone === 'function' && typeof resposta.status === 'number') {
        try {
            const { message: mensagem } = await lerErroFuncao(error);
            if (mensagem) return `${mensagem} (HTTP ${resposta.status})`;
        } catch {
            // Keep the SDK error when the function response is not JSON.
        }
        return `${error?.message || 'A Edge Function recusou a solicitação.'} (HTTP ${resposta.status})`;
    }
    return error?.message || 'Não foi possível iniciar a assinatura.';
}
