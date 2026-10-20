/**
 * Configura taxas gerais e taxas específicas das maquininhas usadas no PDV.
 */

import { adminSupabase as supabase } from '../../core/config.js';

const parcelasDisponiveis = Array.from({ length: 11 }, (_, indice) => indice + 2);

function escaparTextoHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

async function lerMensagemErroFuncao(error) {
    const resposta = error?.context;
    if (resposta && typeof resposta.clone === 'function') {
        try {
            const corpo = await resposta.clone().json();
            const mensagem = typeof corpo?.error === 'string'
                ? corpo.error
                : typeof corpo?.message === 'string' ? corpo.message : '';
            if (mensagem) return `${mensagem}${resposta.status ? ` (HTTP ${resposta.status})` : ''}`;
        } catch {
            try {
                const mensagem = await resposta.clone().text();
                if (mensagem) return `${mensagem}${resposta.status ? ` (HTTP ${resposta.status})` : ''}`;
            } catch {
                return error?.message || 'A solicitação foi recusada pelo serviço.';
            }
        }
    }
    return error?.message || 'Não foi possível concluir a solicitação.';
}

function obterTaxasParcelamento(valor) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) return valor;
    if (typeof valor === 'string') {
        try {
            const taxas = JSON.parse(valor);
            return taxas && typeof taxas === 'object' && !Array.isArray(taxas) ? taxas : {};
        } catch (error) {
            console.error('PDV-VS: Configuração de parcelas da maquininha está inválida:', error);
            return {};
        }
    }
    return {};
}

export async function initAdminMaquininhas(containerEl) {
    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar as taxas das maquininhas.');

    containerEl.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-lg font-bold text-white">Configuração de Pagamentos: Auto Pix &amp; Maquininhas</h2>
                <p class="text-xs text-gray-400">Configure o Pix automático, o recebimento Pix próprio e as taxas das maquininhas de cartão.</p>
            </div>

            <form id="form-taxas" class="max-w-xl bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-700 space-y-4">
                <h3 class="text-sm font-bold text-white">Taxas gerais da empresa</h3>
                <p class="text-xs text-gray-400">Usadas somente quando nenhuma maquininha específica estiver cadastrada.</p>
                <div>
                    <label for="taxa-debito" class="text-xs font-bold text-gray-300">Taxa débito (%)</label>
                    <input type="number" min="0" max="100" step="0.01" id="taxa-debito" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" value="1.99">
                </div>
                <div>
                    <label for="taxa-credito-vista" class="text-xs font-bold text-gray-300">Taxa crédito à vista (%)</label>
                    <input type="number" min="0" max="100" step="0.01" id="taxa-credito-vista" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" value="3.49">
                </div>
                <div>
                    <label for="taxa-credito-parcelado" class="text-xs font-bold text-gray-300">Taxa média mensal de crédito parcelado (%)</label>
                    <input type="number" min="0" max="100" step="0.01" id="taxa-credito-parcelado" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" value="4.99">
                </div>
                <p id="status-taxas" class="hidden text-xs" role="status"></p>
                <button type="submit" class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 rounded-lg text-sm">Salvar taxas gerais</button>
            </form>

            <section class="max-w-3xl space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
                <div>
                    <h3 class="text-base font-bold text-white">Recebimento por Pix</h3>
                    <p class="mt-1 text-xs text-gray-400">No modo padrão, use seu QR próprio e confirme o recebimento no caixa. Você pode ativar a cobrança automática do Asaas quando desejar.</p>
                </div>
                <form id="form-pix-settings" class="space-y-3">
                    <label for="pix-qr-file" class="text-xs font-bold text-gray-300">Imagem do QR Pix próprio (PNG, JPEG ou WebP; até 500 KB)</label>
                    <input id="pix-qr-file" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white">
                    <p class="text-xs text-gray-400">A imagem fica na configuração da empresa e o pagamento será confirmado manualmente pelo operador.</p>
                    <img id="pix-qr-preview" alt="Prévia do QR Pix da empresa" class="hidden max-h-48 rounded-lg border border-gray-600 bg-white p-2">
                    <p id="status-pix-settings" class="hidden text-xs" role="status"></p>
                    <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">Salvar QR Pix próprio</button>
                </form>

                <div id="asaas-onboarding-card" class="border-t border-gray-700 pt-4">
                    <h4 class="text-sm font-bold text-white">Ativar Pagamentos Automáticos via Asaas</h4>
                    <p class="mt-1 text-xs text-gray-400">Ative o Pix dinâmico com confirmação automática. A criação da subconta acontece após a confirmação da taxa única de ativação.</p>
                    <p id="asaas-account-status" class="mt-3 hidden text-xs" role="status"></p>
                    <button id="btn-ativar-asaas" type="button" class="mt-3 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600">Ativar pagamentos automáticos</button>
                    <button id="btn-voltar-pix-proprio" type="button" class="mt-3 hidden rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-600">Voltar ao Pix próprio</button>
                </div>
            </section>

            <div id="modal-onboarding-asaas" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-onboarding-asaas">
                <section class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-2xl">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <h3 id="titulo-onboarding-asaas" class="text-lg font-bold text-white">Ativar pagamentos via Asaas</h3>
                        <button id="btn-fechar-onboarding-asaas" type="button" class="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-bold text-white">Fechar</button>
                    </div>
                    <div id="asaas-account-form-step">
                    <p class="mb-3 text-xs leading-5 text-gray-400">Confira os dados cadastrais para a análise e criação da subconta. Os dados bancários para saques serão cadastrados pelo titular diretamente no Asaas após a ativação; o PDV não coleta informações bancárias.</p>
                    <div class="mb-4 rounded-xl border border-amber-700/60 bg-amber-950/30 p-3">
                        <p class="text-sm font-bold text-amber-200">Taxa única de ativação: R$ 49,99</p>
                        <p class="mt-1 text-xs leading-5 text-amber-100/80">Referente à homologação, criação da subconta e ativação do ambiente financeiro SubChef.</p>
                    </div>
                    <form id="form-asaas-account" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label class="text-xs font-bold text-gray-300">Razão social / nome
                            <input name="name" required maxlength="120" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">E-mail do titular
                            <input name="email" type="email" required maxlength="160" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">CPF/CNPJ
                            <input name="cpfCnpj" required inputmode="numeric" maxlength="18" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Celular
                            <input name="mobilePhone" required inputmode="tel" maxlength="20" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Faturamento mensal estimado (R$)
                            <input name="incomeValue" type="number" required min="1" step="0.01" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Tipo de empresa
                            <select name="companyType" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                                <option value="">Não informado</option>
                                <option value="MEI">MEI</option>
                                <option value="LIMITED">Limitada</option>
                                <option value="INDIVIDUAL">Pessoa física</option>
                                <option value="ASSOCIATION">Associação</option>
                            </select>
                        </label>
                        <label class="text-xs font-bold text-gray-300">Endereço
                            <input name="address" required maxlength="150" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Número
                            <input name="addressNumber" required maxlength="20" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Bairro
                            <input name="province" required maxlength="100" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">CEP
                            <input name="postalCode" required inputmode="numeric" maxlength="9" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300">Cidade
                            <input name="city" required maxlength="100" autocomplete="address-level2" class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                        </label>
                        <label class="text-xs font-bold text-gray-300 sm:col-span-2">Forma de pagamento da taxa
                            <select name="billingType" required class="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                                <option value="PIX">Pix</option>
                                <option value="CREDIT_CARD">Cartão de crédito no checkout seguro do Asaas</option>
                            </select>
                        </label>
                        <label class="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs leading-5 text-gray-200 sm:col-span-2">
                            <input name="acceptTerms" type="checkbox" required class="mt-1 accent-emerald-500">
                            <span>Li e concordo com os <a href="../../termos.html#termos" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-400 underline">Termos de Uso e Condições do Gateway</a>. Estou ciente da taxa única de R$ 49,99 para liberação da subconta. Compreendo que as vendas via Pix Dinâmico possuem a tarifa do Asaas (atualmente R$ 0,99 promocional até 18/01/2027, sujeita a alterações pelo gateway mediante aviso prévio) somada ao split fixo do sistema de R$ 0,10 por transação, e autorizo a criação da subconta no Asaas. Após a ativação, cadastrarei a conta ou chave Pix de saque diretamente no Asaas.</span>
                        </label>
                        <p id="status-asaas-account" class="hidden sm:col-span-2 text-xs" role="status"></p>
                        <button type="submit" class="sm:col-span-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600">Aceitar termos e pagar R$ 49,99 para ativar</button>
                    </form>
                    </div>
                    <section id="asaas-account-payment-step" class="hidden space-y-4" aria-live="polite">
                        <div class="rounded-xl border border-gray-700 bg-gray-800 p-4">
                            <p class="text-sm font-bold text-white">Pagamento da taxa de ativação</p>
                            <p id="asaas-payment-instructions" class="mt-1 text-xs leading-5 text-gray-400"></p>
                        </div>
                        <div id="asaas-pix-payment" class="hidden space-y-3 text-center">
                            <img id="asaas-activation-pix-image" alt="QR Code Pix da taxa de ativação" class="mx-auto max-h-64 rounded-xl bg-white p-3">
                            <label class="block text-left text-xs font-bold text-gray-300">Pix Copia e Cola
                                <textarea id="asaas-activation-pix-copy" readonly rows="4" class="mt-1 w-full resize-y rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs text-white"></textarea>
                            </label>
                            <button id="btn-copiar-asaas-pix" type="button" class="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">
                                <i class="fa-solid fa-copy mr-1" aria-hidden="true"></i>Copiar código Pix
                            </button>
                        </div>
                        <a id="asaas-activation-checkout-link" class="hidden w-full rounded-lg bg-sky-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-sky-600" target="_blank" rel="noopener noreferrer">
                            <i class="fa-solid fa-lock mr-1" aria-hidden="true"></i>Abrir checkout seguro do Asaas
                        </a>
                        <p id="asaas-activation-payment-status" class="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200" role="status">Aguardando a confirmação do pagamento pelo Asaas...</p>
                    </section>
                </section>
            </div>

            <section class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-700 pt-5">
                    <div>
                        <h3 class="text-base font-bold text-white">Minhas maquininhas</h3>
                        <p class="text-xs text-gray-400">Configure os percentuais cobrados em cada modalidade. Para parcelas sem taxa preenchida, a opção não será oferecida no caixa.</p>
                    </div>
                    <button id="btn-cancelar-edicao-maquininha" type="button" class="hidden rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold text-white">Cancelar edição</button>
                </div>

                <form id="form-maquininha" class="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-4">
                    <input id="maquininha-id" type="hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label for="maquininha-nome" class="text-xs font-bold text-gray-300">Nome da maquininha</label>
                            <input id="maquininha-nome" required maxlength="80" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" placeholder="Ex.: Stone, Ton">
                        </div>
                        <div>
                            <label for="maquininha-debito" class="text-xs font-bold text-gray-300">Débito (%)</label>
                            <input id="maquininha-debito" type="number" min="0" max="100" step="0.01" required class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" value="0">
                        </div>
                        <div>
                            <label for="maquininha-credito-vista" class="text-xs font-bold text-gray-300">Crédito à vista (%)</label>
                            <input id="maquininha-credito-vista" type="number" min="0" max="100" step="0.01" required class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" value="0">
                        </div>
                    </div>
                    <fieldset>
                        <legend class="mb-2 text-xs font-bold text-gray-300">Taxa de crédito parcelado (%)</legend>
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            ${parcelasDisponiveis.map(parcela => `
                                <label class="text-xs text-gray-400">
                                    ${parcela}x
                                    <input data-taxa-parcela="${parcela}" type="number" min="0" max="100" step="0.01" class="w-full mt-1 px-2 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white" placeholder="Não configurada">
                                </label>
                            `).join('')}
                        </div>
                    </fieldset>
                    <p id="status-maquininha" class="hidden text-xs" role="status"></p>
                    <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">Salvar maquininha</button>
                </form>

                <div id="lista-maquininhas" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <p class="text-sm text-gray-400">Carregando maquininhas...</p>
                </div>
            </section>
        </div>
    `;

    const taxaForm = containerEl.querySelector('#form-taxas');
    const taxaStatus = containerEl.querySelector('#status-taxas');
    const maquinaForm = containerEl.querySelector('#form-maquininha');
    const maquinaStatus = containerEl.querySelector('#status-maquininha');
    const listaMaquinas = containerEl.querySelector('#lista-maquininhas');
    const botaoCancelarEdicao = containerEl.querySelector('#btn-cancelar-edicao-maquininha');
    const pixForm = containerEl.querySelector('#form-pix-settings');
    const pixImageInput = containerEl.querySelector('#pix-qr-file');
    const pixPreview = containerEl.querySelector('#pix-qr-preview');
    const pixStatus = containerEl.querySelector('#status-pix-settings');
    const asaasForm = containerEl.querySelector('#form-asaas-account');
    const asaasStatus = containerEl.querySelector('#status-asaas-account');
    const asaasCardStatus = containerEl.querySelector('#asaas-account-status');
    const asaasModal = containerEl.querySelector('#modal-onboarding-asaas');
    const asaasAccountFormStep = containerEl.querySelector('#asaas-account-form-step');
    const asaasPaymentStep = containerEl.querySelector('#asaas-account-payment-step');
    const asaasPixPayment = containerEl.querySelector('#asaas-pix-payment');
    const asaasCheckoutLink = containerEl.querySelector('#asaas-activation-checkout-link');
    const asaasPaymentStatus = containerEl.querySelector('#asaas-activation-payment-status');
    const asaasPaymentInstructions = containerEl.querySelector('#asaas-payment-instructions');
    const asaasActivateButton = containerEl.querySelector('#btn-ativar-asaas');
    const asaasManualButton = containerEl.querySelector('#btn-voltar-pix-proprio');
    let pixQrCode = null;
    let activationPollTimer = null;

    const camposTaxaGeral = {
        debito: containerEl.querySelector('#taxa-debito'),
        creditoVista: containerEl.querySelector('#taxa-credito-vista'),
        creditoParcelado: containerEl.querySelector('#taxa-credito-parcelado')
    };

    const mostrarStatus = (elemento, texto, sucesso = false) => {
        elemento.textContent = texto;
        elemento.className = `text-xs ${sucesso ? 'text-emerald-400' : 'text-rose-400'}`;
    };

    async function carregarMaquininhas() {
        const { data, error } = await supabase
            .from('maquininhas_taxas')
            .select('id, nome_maquina, taxa_debito, taxa_credito_avista, taxas_parcelamento')
            .eq('empresa_id', empresaId)
            .order('nome_maquina');
        if (error) {
            console.error('PDV-VS: Erro ao carregar maquininhas:', error);
            listaMaquinas.innerHTML = `<p class="text-sm text-rose-400">Erro ao carregar maquininhas: ${escaparTextoHtml(error.message)}</p>`;
            return;
        }

        if (!data?.length) {
            listaMaquinas.innerHTML = '<p class="text-sm text-gray-400">Nenhuma maquininha específica cadastrada.</p>';
            return;
        }

        listaMaquinas.innerHTML = data.map(maquina => {
            const taxasParcelamento = obterTaxasParcelamento(maquina.taxas_parcelamento);
            const resumoParcelas = parcelasDisponiveis
                .filter(parcela => taxasParcelamento[parcela] !== undefined && taxasParcelamento[parcela] !== null && taxasParcelamento[parcela] !== '')
                .map(parcela => `${parcela}x: ${Number(taxasParcelamento[parcela]).toFixed(2)}%`)
                .join(' · ') || 'Sem parcelas configuradas';
            return `
                <article class="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <h4 class="truncate font-bold text-white">${escaparTextoHtml(maquina.nome_maquina)}</h4>
                            <p class="mt-1 text-xs text-gray-400">Débito: ${Number(maquina.taxa_debito).toFixed(2)}% · Crédito à vista: ${Number(maquina.taxa_credito_avista).toFixed(2)}%</p>
                            <p class="mt-1 text-xs text-gray-400">${escaparTextoHtml(resumoParcelas)}</p>
                        </div>
                        <div class="flex shrink-0 gap-2">
                            <button type="button" data-editar-maquininha="${maquina.id}" class="rounded bg-gray-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-gray-600">Editar</button>
                            <button type="button" data-excluir-maquininha="${maquina.id}" class="rounded bg-rose-900/70 px-2.5 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-800">Excluir</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        listaMaquinas._maquinas = data;
    }

    function limparEdicaoMaquininha() {
        maquinaForm.reset();
        containerEl.querySelector('#maquininha-id').value = '';
        containerEl.querySelector('#maquininha-debito').value = '0';
        containerEl.querySelector('#maquininha-credito-vista').value = '0';
        botaoCancelarEdicao.classList.add('hidden');
        maquinaForm.querySelector('button[type="submit"]').textContent = 'Salvar maquininha';
        maquinaStatus.className = 'hidden text-xs';
    }

    const { data: configuracao, error: erroConsultaTaxas } = await supabase
        .from('empresas_config')
        .select('taxa_debito, taxa_credito_vista, taxa_credito_parcelado, pix_payment_mode, pix_qr_code')
        .eq('empresa_id', empresaId)
        .maybeSingle();
    if (erroConsultaTaxas) {
        console.error('PDV-VS: Erro ao carregar taxas gerais:', erroConsultaTaxas);
        mostrarStatus(taxaStatus, `Não foi possível carregar as taxas gerais: ${erroConsultaTaxas.message}`);
    } else if (configuracao) {
        camposTaxaGeral.debito.value = String(configuracao.taxa_debito);
        camposTaxaGeral.creditoVista.value = String(configuracao.taxa_credito_vista);
        camposTaxaGeral.creditoParcelado.value = String(configuracao.taxa_credito_parcelado);
        pixQrCode = configuracao.pix_qr_code || null;
        if (pixQrCode) {
            pixPreview.src = pixQrCode;
            pixPreview.classList.remove('hidden');
        }
    }

    const { data: companyProfile, error: companyProfileError } = await supabase
        .from('empresas')
        .select('nome_empresa, nome_mercado, cnpj, email, email_admin, whatsapp, endereco, numero, cep, cidade, estado, bairro, tipo_empresa, faturamento_mensal_estimado')
        .eq('id', empresaId)
        .maybeSingle();
    if (companyProfileError) {
        console.error('PDV-VS: Erro ao carregar dados cadastrais para o onboarding Asaas:', companyProfileError);
        mostrarStatus(asaasStatus, `Não foi possível carregar os dados cadastrais: ${companyProfileError.message}`);
    } else if (companyProfile) {
        const values = {
            name: companyProfile.nome_empresa || companyProfile.nome_mercado || '',
            email: companyProfile.email_admin || companyProfile.email || '',
            cpfCnpj: companyProfile.cnpj || '',
            mobilePhone: companyProfile.whatsapp || '',
            incomeValue: companyProfile.faturamento_mensal_estimado || '',
            companyType: companyProfile.tipo_empresa || '',
            address: companyProfile.endereco || '',
            addressNumber: companyProfile.numero || '',
            province: companyProfile.bairro || '',
            postalCode: companyProfile.cep || '',
            city: companyProfile.cidade || '',
        };
        Object.entries(values).forEach(([name, value]) => {
            const input = asaasForm.elements.namedItem(name);
            if (input) input.value = String(value);
        });
    }

    const { data: gatewayStatus, error: gatewayStatusError } = await supabase.functions.invoke('pdv-asaas', {
        body: { action: 'status', empresaId }
    });
    let gatewayConnected = Boolean(gatewayStatus?.connected);
    if (gatewayStatusError) {
        mostrarStatus(asaasStatus, `Não foi possível verificar a conexão Asaas: ${gatewayStatusError.message}`);
    } else if (gatewayConnected) {
        const modeText = gatewayStatus.gatewayMode === 'ASAAS_REAL'
            ? 'Pagamentos automáticos via Asaas estão ativos.'
            : 'Subconta Asaas conectada; pagamentos continuam no modo Pix próprio até você ativar.';
        mostrarStatus(asaasCardStatus, modeText, true);
        asaasActivateButton.classList.toggle('hidden', gatewayStatus.gatewayMode === 'ASAAS_REAL');
        asaasManualButton.classList.toggle('hidden', gatewayStatus.gatewayMode !== 'ASAAS_REAL');
    } else if (gatewayStatus?.activation?.status === 'PENDING_PAYMENT'
        || gatewayStatus?.activation?.status === 'CREATING_ACCOUNT') {
        mostrarStatus(asaasCardStatus, 'Aguardando a confirmação da taxa de ativação pelo Asaas.', true);
        asaasActivateButton.textContent = 'Continuar ativação pendente';
    } else if (gatewayStatus?.activation?.status === 'REVIEW_REQUIRED') {
        mostrarStatus(asaasCardStatus, 'A taxa foi confirmada, mas a ativação precisa de análise do suporte. Não pague novamente.', false);
        asaasActivateButton.disabled = true;
        asaasActivateButton.textContent = 'Ativação em análise';
    } else {
        mostrarStatus(asaasCardStatus, 'Modo Pix próprio ativo. Nenhuma cobrança será enviada ao Asaas.', true);
    }

    function pararMonitoramentoAtivacao() {
        if (activationPollTimer !== null) {
            window.clearInterval(activationPollTimer);
            activationPollTimer = null;
        }
    }

    function iniciarMonitoramentoAtivacao(activationId) {
        pararMonitoramentoAtivacao();
        activationPollTimer = window.setInterval(async () => {
            try {
                const { data, error } = await supabase.functions.invoke('pdv-asaas', {
                    body: { action: 'activation_status', empresaId, activationId }
                });
                if (error) throw error;
                if (data?.status === 'ACTIVE') {
                    pararMonitoramentoAtivacao();
                    gatewayConnected = true;
                    asaasPaymentStatus.textContent = 'Pagamento confirmado e subconta criada. Cadastre/valide sua conta de saque diretamente no Asaas para receber os repasses.';
                    asaasPaymentStatus.className = 'rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-200';
                    mostrarStatus(asaasCardStatus, 'Pagamento confirmado. A subconta foi criada e o Pix automático está ativo.', true);
                    asaasActivateButton.classList.add('hidden');
                    asaasManualButton.classList.remove('hidden');
                } else if (data?.status === 'FAILED') {
                    pararMonitoramentoAtivacao();
                    asaasPaymentStatus.textContent = data.failure_message
                        || 'O pagamento foi recebido, mas a ativação precisa de análise do suporte. Não pague novamente.';
                    asaasPaymentStatus.className = 'rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200';
                } else if (data?.status === 'REVIEW_REQUIRED') {
                    pararMonitoramentoAtivacao();
                    asaasPaymentStatus.textContent = data.failure_message
                        || 'A taxa foi confirmada, mas a ativação requer análise do suporte. Não pague novamente.';
                    asaasPaymentStatus.className = 'rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200';
                }
            } catch (error) {
                console.error('PDV-VS: Não foi possível consultar a ativação Asaas:', error);
            }
        }, 5000);
    }

    function mostrarPagamentoAtivacao(data) {
        asaasAccountFormStep.classList.add('hidden');
        asaasPaymentStep.classList.remove('hidden');
        asaasPixPayment.classList.add('hidden');
        asaasCheckoutLink.classList.add('hidden');
        asaasPaymentInstructions.textContent = data.message || 'Conclua o pagamento para que o Asaas crie sua subconta.';
        asaasPaymentStatus.textContent = 'Aguardando a confirmação do pagamento pelo Asaas...';
        asaasPaymentStatus.className = 'rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200';

        if (data.billingType === 'PIX' && data.pix) {
            const encodedImage = typeof data.pix.encodedImage === 'string' ? data.pix.encodedImage : '';
            const pixPayload = typeof data.pix.payload === 'string' ? data.pix.payload : '';
            if (!encodedImage || !pixPayload) throw new Error('O Asaas não retornou o QR e o código Pix completos.');
            const image = encodedImage.startsWith('data:image/')
                ? encodedImage
                : `data:image/png;base64,${encodedImage}`;
            containerEl.querySelector('#asaas-activation-pix-image').src = image;
            containerEl.querySelector('#asaas-activation-pix-copy').value = pixPayload;
            asaasPixPayment.classList.remove('hidden');
        } else if (data.billingType === 'CREDIT_CARD' && typeof data.paymentUrl === 'string') {
            const url = new URL(data.paymentUrl);
            if (url.protocol !== 'https:' || !['asaas.com', 'www.asaas.com', 'sandbox.asaas.com'].includes(url.hostname)) {
                throw new Error('O Asaas retornou um endereço de checkout inválido.');
            }
            asaasCheckoutLink.href = url.href;
            asaasCheckoutLink.classList.remove('hidden');
        } else {
            throw new Error('A resposta do Asaas não incluiu um meio de pagamento válido.');
        }
        iniciarMonitoramentoAtivacao(data.activationId);
    }

    const fecharModalAsaas = () => {
        pararMonitoramentoAtivacao();
        asaasModal.classList.add('hidden');
        asaasModal.classList.remove('flex');
    };
    asaasActivateButton.addEventListener('click', async () => {
        if (gatewayConnected) {
            asaasActivateButton.disabled = true;
            try {
                const { data, error } = await supabase.functions.invoke('pdv-asaas', {
                    body: { action: 'set_asaas_real', empresaId }
                });
                if (error) throw error;
                if (!data?.updated) throw new Error(data?.error || 'Não foi possível ativar os pagamentos Asaas.');
                mostrarStatus(asaasCardStatus, 'Pagamentos automáticos via Asaas estão ativos.', true);
                asaasActivateButton.classList.add('hidden');
                asaasManualButton.classList.remove('hidden');
            } catch (error) {
                console.error('PDV-VS: Erro ao ativar a subconta Asaas existente:', error);
                mostrarStatus(asaasCardStatus, `Não foi possível ativar o Asaas: ${error.message}`);
            } finally {
                asaasActivateButton.disabled = false;
            }
            return;
        }
        asaasModal.classList.remove('hidden');
        asaasModal.classList.add('flex');
        asaasAccountFormStep.classList.remove('hidden');
        asaasPaymentStep.classList.add('hidden');
        if (['PENDING_PAYMENT', 'CREATING_ACCOUNT', 'REVIEW_REQUIRED'].includes(gatewayStatus?.activation?.status)) {
            asaasAccountFormStep.classList.add('hidden');
            try {
                const { data, error } = await supabase.functions.invoke('pdv-asaas', {
                    body: {
                        action: 'activation_status',
                        empresaId,
                        activationId: gatewayStatus.activation.id,
                    }
                });
                if (error) throw error;
                if (data?.status === 'PENDING_PAYMENT') {
                    mostrarPagamentoAtivacao({
                        ...data,
                        activationId: data.id,
                        message: data.billingType === 'PIX'
                            ? 'Use o QR Code ou o Pix Copia e Cola já gerado para esta ativação.'
                            : 'Continue o pagamento no checkout oficial do Asaas já iniciado.',
                    });
                } else if (data?.status === 'CREATING_ACCOUNT') {
                    asaasPaymentStep.classList.remove('hidden');
                    asaasPaymentInstructions.textContent = 'Pagamento recebido. O Asaas está criando sua subconta.';
                    asaasPaymentStatus.textContent = 'Aguardando a conclusão da criação da subconta...';
                    iniciarMonitoramentoAtivacao(data.id);
                } else if (data?.status === 'REVIEW_REQUIRED') {
                    asaasPaymentStep.classList.remove('hidden');
                    asaasPaymentInstructions.textContent = 'O pagamento foi confirmado, mas a ativação requer análise do suporte.';
                    asaasPaymentStatus.textContent = data.failure_message || 'Não pague novamente. Contate o suporte para continuar.';
                    asaasPaymentStatus.className = 'rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200';
                } else {
                    asaasAccountFormStep.classList.remove('hidden');
                    asaasForm.elements.namedItem('acceptTerms').focus();
                }
            } catch (error) {
                console.error('PDV-VS: Erro ao recuperar a cobrança de ativação pendente:', error);
                asaasAccountFormStep.classList.remove('hidden');
                mostrarStatus(asaasStatus, `Não foi possível recuperar a cobrança pendente: ${await lerMensagemErroFuncao(error)}`);
            }
        } else {
            asaasForm.elements.namedItem('name')?.focus();
        }
    });
    containerEl.querySelector('#btn-fechar-onboarding-asaas').addEventListener('click', fecharModalAsaas);
    asaasModal.addEventListener('click', event => {
        if (event.target === asaasModal) fecharModalAsaas();
    });

    pixImageInput.addEventListener('change', () => {
        const file = pixImageInput.files?.[0];
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 500 * 1024) {
            pixImageInput.value = '';
            mostrarStatus(pixStatus, 'Escolha uma imagem PNG, JPEG ou WebP com até 500 KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                mostrarStatus(pixStatus, 'Não foi possível ler a imagem selecionada.');
                return;
            }
            pixQrCode = reader.result;
            pixPreview.src = pixQrCode;
            pixPreview.classList.remove('hidden');
        };
        reader.onerror = () => mostrarStatus(pixStatus, 'Não foi possível ler a imagem selecionada.');
        reader.readAsDataURL(file);
    });

    pixForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!pixQrCode) {
            mostrarStatus(pixStatus, 'Envie a imagem do QR Pix próprio antes de salvar.');
            return;
        }
        const button = pixForm.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            const { error } = await supabase.from('empresas_config').upsert({
                empresa_id: empresaId,
                pix_qr_code: pixQrCode,
            }, { onConflict: 'empresa_id' });
            if (error) throw error;
            mostrarStatus(pixStatus, 'Configuração Pix salva. Ela permanecerá ativa até ser alterada novamente.', true);
        } catch (error) {
            console.error('PDV-VS: Erro ao salvar configuração Pix:', error);
            mostrarStatus(pixStatus, `Erro ao salvar configuração Pix: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    });

    asaasForm.addEventListener('submit', async event => {
        event.preventDefault();
        const button = asaasForm.querySelector('button[type="submit"]');
        const formData = new FormData(asaasForm);
        const accountData = Object.fromEntries(formData.entries());
        accountData.acceptTerms = formData.get('acceptTerms') === 'on';
        accountData.companyType = String(accountData.companyType || '');
        accountData.incomeValue = Number(accountData.incomeValue);
        accountData.billingType = String(formData.get('billingType') || 'PIX');
        button.disabled = true;
        try {
            const { data, error } = await supabase.functions.invoke('pdv-asaas', {
                body: { action: 'start_account_activation', empresaId, ...accountData }
            });
            if (error) throw error;
            if (data?.connected) {
                gatewayConnected = true;
                fecharModalAsaas();
                mostrarStatus(asaasCardStatus, data.message, true);
                asaasActivateButton.classList.add('hidden');
                asaasManualButton.classList.toggle('hidden', data.gatewayMode === 'ASAAS_REAL');
                return;
            }
            mostrarPagamentoAtivacao(data);
        } catch (error) {
            console.error('PDV-VS: Erro ao conectar subconta Asaas:', error);
            mostrarStatus(asaasStatus, `Não foi possível iniciar a ativação Asaas: ${await lerMensagemErroFuncao(error)}`);
        } finally {
            if (!gatewayConnected) button.disabled = false;
        }
    });

    containerEl.querySelector('#btn-copiar-asaas-pix').addEventListener('click', async () => {
        const pixPayload = containerEl.querySelector('#asaas-activation-pix-copy').value;
        try {
            await navigator.clipboard.writeText(pixPayload);
            asaasPaymentStatus.textContent = 'Código Pix copiado. Aguardando a confirmação do pagamento pelo Asaas...';
            asaasPaymentStatus.className = 'rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-200';
        } catch (error) {
            console.error('PDV-VS: Não foi possível copiar o código Pix:', error);
            asaasPaymentStatus.textContent = 'Não foi possível copiar automaticamente. Selecione e copie o código Pix manualmente.';
            asaasPaymentStatus.className = 'rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200';
        }
    });

    asaasManualButton.addEventListener('click', async () => {
        asaasManualButton.disabled = true;
        try {
            const { data, error } = await supabase.functions.invoke('pdv-asaas', {
                body: { action: 'set_simulated', empresaId }
            });
            if (error) throw error;
            if (!data?.updated) throw new Error(data?.error || 'Não foi possível voltar ao Pix próprio.');
            mostrarStatus(asaasCardStatus, 'Modo Pix próprio ativo. As cobranças voltarão a exigir confirmação manual.', true);
            asaasManualButton.classList.add('hidden');
            asaasActivateButton.classList.remove('hidden');
        } catch (error) {
            console.error('PDV-VS: Erro ao alterar o modo de recebimento Pix:', error);
            mostrarStatus(asaasCardStatus, `Não foi possível alterar o modo Pix: ${error.message}`);
        } finally {
            asaasManualButton.disabled = false;
        }
    });

    taxaForm.addEventListener('submit', async event => {
        event.preventDefault();
        const taxas = {
            taxa_debito: Number(camposTaxaGeral.debito.value),
            taxa_credito_vista: Number(camposTaxaGeral.creditoVista.value),
            taxa_credito_parcelado: Number(camposTaxaGeral.creditoParcelado.value)
        };
        if (Object.values(taxas).some(taxa => !Number.isFinite(taxa) || taxa < 0 || taxa > 100)) {
            mostrarStatus(taxaStatus, 'Informe percentuais entre 0 e 100.');
            return;
        }

        const botao = taxaForm.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
            const { error } = await supabase.from('empresas_config').upsert({
                empresa_id: empresaId,
                ...taxas
            }, { onConflict: 'empresa_id' });
            if (error) throw error;
            mostrarStatus(taxaStatus, 'Taxas gerais atualizadas.', true);
        } catch (error) {
            console.error('PDV-VS: Erro ao salvar taxas gerais:', error);
            mostrarStatus(taxaStatus, `Erro ao salvar taxas: ${error.message}`);
        } finally {
            botao.disabled = false;
        }
    });

    maquinaForm.addEventListener('submit', async event => {
        event.preventDefault();
        const nome = containerEl.querySelector('#maquininha-nome').value.trim();
        const taxaDebito = Number(containerEl.querySelector('#maquininha-debito').value);
        const taxaCreditoVista = Number(containerEl.querySelector('#maquininha-credito-vista').value);
        const taxasParcelamento = {};
        maquinaForm.querySelectorAll('[data-taxa-parcela]').forEach(campo => {
            if (campo.value.trim() !== '') taxasParcelamento[campo.dataset.taxaParcela] = Number(campo.value);
        });
        const taxas = [taxaDebito, taxaCreditoVista, ...Object.values(taxasParcelamento)];
        if (!nome || taxas.some(taxa => !Number.isFinite(taxa) || taxa < 0 || taxa > 100)) {
            mostrarStatus(maquinaStatus, 'Informe nome e percentuais válidos entre 0 e 100.');
            return;
        }

        const maquinaId = containerEl.querySelector('#maquininha-id').value;
        const registro = {
            empresa_id: empresaId,
            nome_maquina: nome,
            taxa_debito: taxaDebito,
            taxa_credito_avista: taxaCreditoVista,
            taxas_parcelamento: taxasParcelamento
        };
        if (maquinaId) registro.id = Number(maquinaId);

        const botao = maquinaForm.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
            const { error } = await supabase.from('maquininhas_taxas').upsert(registro, { onConflict: 'id' });
            if (error) throw error;
            limparEdicaoMaquininha();
            await carregarMaquininhas();
            mostrarStatus(maquinaStatus, 'Maquininha salva. Ela já pode ser selecionada no caixa.', true);
        } catch (error) {
            console.error('PDV-VS: Erro ao salvar maquininha:', error);
            mostrarStatus(maquinaStatus, `Erro ao salvar maquininha: ${error.message}`);
        } finally {
            botao.disabled = false;
        }
    });

    botaoCancelarEdicao.addEventListener('click', limparEdicaoMaquininha);

    listaMaquinas.addEventListener('click', async event => {
        const botaoEditar = event.target.closest('[data-editar-maquininha]');
        if (botaoEditar) {
            const maquina = listaMaquinas._maquinas.find(item => String(item.id) === botaoEditar.dataset.editarMaquininha);
            if (!maquina) return;
            const taxasParcelamento = obterTaxasParcelamento(maquina.taxas_parcelamento);
            containerEl.querySelector('#maquininha-id').value = String(maquina.id);
            containerEl.querySelector('#maquininha-nome').value = maquina.nome_maquina;
            containerEl.querySelector('#maquininha-debito').value = String(maquina.taxa_debito);
            containerEl.querySelector('#maquininha-credito-vista').value = String(maquina.taxa_credito_avista);
            maquinaForm.querySelectorAll('[data-taxa-parcela]').forEach(campo => {
                campo.value = taxasParcelamento[campo.dataset.taxaParcela] ?? '';
            });
            botaoCancelarEdicao.classList.remove('hidden');
            maquinaForm.querySelector('button[type="submit"]').textContent = 'Atualizar maquininha';
            maquinaStatus.className = 'hidden text-xs';
            maquinaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const botaoExcluir = event.target.closest('[data-excluir-maquininha]');
        if (!botaoExcluir || !confirm('Deseja excluir esta maquininha?')) return;
        botaoExcluir.disabled = true;
        try {
            const { error } = await supabase.from('maquininhas_taxas')
                .delete()
                .eq('id', botaoExcluir.dataset.excluirMaquininha)
                .eq('empresa_id', empresaId);
            if (error) throw error;
            await carregarMaquininhas();
        } catch (error) {
            console.error('PDV-VS: Erro ao excluir maquininha:', error);
            mostrarStatus(maquinaStatus, `Erro ao excluir maquininha: ${error.message}`);
            botaoExcluir.disabled = false;
        }
    });

    await carregarMaquininhas();
}
