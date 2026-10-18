import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJsonObject(response: Response) {
  const result: unknown = await response.json();
  if (!isRecord(result)) throw new Error('Resposta inválida recebida do Asaas.');
  return result;
}

function normalizeBaseUrl(value: string | undefined) {
  const base = (value || 'https://api.asaas.com/v3').replace(/\/+$/, '');
  if (!/^https:\/\/(api|api-sandbox)\.asaas\.com\/v3$/.test(base)) {
    throw new Error('ASAAS_API_URL deve apontar para a API oficial do Asaas.');
  }
  return base;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Supabase function environment is not configured.');
    return response(503, { error: 'O serviço de assinaturas está temporariamente indisponível.' });
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return response(401, { error: 'Faça login como administrador.' });
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return response(401, { error: 'Sua sessão expirou. Entre novamente.' });

  const database = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const apiKey = Deno.env.get('ASAAS_API_KEY')?.trim();
  if (!apiKey) {
    return response(200, {
      configured: false,
      message: 'A integração de pagamentos aguarda a configuração das chaves do Asaas no ambiente seguro do servidor.',
    });
  }

  try {
    let body: Record<string, unknown>;
    try {
      const payload: unknown = await request.json();
      if (!isRecord(payload)) return response(400, { error: 'O corpo da solicitação deve ser um objeto JSON.' });
      body = payload;
    } catch {
      return response(400, { error: 'Envie uma solicitação JSON válida.' });
    }

    const email = user.email?.trim().toLowerCase() || '';
    let { data: company, error: companyError } = await database
      .from('empresas')
      .select('id, nome_mercado, nome_empresa, cnpj, email, email_admin, whatsapp, asaas_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!company && !companyError && email) {
      const companyByEmail = await database
        .from('empresas')
        .select('id, nome_mercado, nome_empresa, cnpj, email, email_admin, whatsapp, asaas_customer_id')
        .ilike('email_admin', email)
        .limit(2);
      company = companyByEmail.data?.length === 1 ? companyByEmail.data[0] : null;
      companyError = companyByEmail.error;
    }
    if (companyError) throw companyError;
    if (!company || (company.id !== user.id
      && company.email_admin?.trim().toLowerCase() !== email
      && company.email?.trim().toLowerCase() !== email)) {
      return response(403, { error: 'Apenas o administrador da empresa pode gerenciar assinaturas.' });
    }

    if (body.action === 'status') {
      return response(200, { configured: true });
    }

    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
    const { data: plan, error: planError } = await database
      .from('planos')
      .select('id, nome, preco_mensal')
      .eq('id', planId)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan || Number(plan.preco_mensal) <= 0) {
      return response(400, { error: 'Selecione um plano pago válido.' });
    }

    if (body.action !== 'subscribe') return response(400, { error: 'Ação de pagamento inválida.' });
    const billingType = body.billingType;
    if (billingType !== 'PIX' && billingType !== 'CREDIT_CARD') {
      return response(400, { error: 'Escolha PIX ou Cartão de Crédito.' });
    }
    const creditCardToken = typeof body.creditCardToken === 'string' ? body.creditCardToken.trim() : '';
    if (billingType === 'CREDIT_CARD' && !creditCardToken) {
      return response(400, { error: 'Para cartão, envie o token seguro gerado pelo SDK oficial do Asaas. Dados de cartão não devem ser enviados ao PDV.' });
    }

    const asaasBaseUrl = normalizeBaseUrl(Deno.env.get('ASAAS_API_URL'));
    let customerId = company.asaas_customer_id;
    if (!customerId) {
      const customerResponse = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: apiKey },
        body: JSON.stringify({
          name: company.nome_mercado || company.nome_empresa,
          email: company.email_admin || company.email || email,
          cpfCnpj: company.cnpj,
          phone: company.whatsapp,
          externalReference: company.id,
        }),
      });
      const customerResult = await readJsonObject(customerResponse);
      if (!customerResponse.ok) {
        console.error('Asaas customer creation failed:', customerResult);
        return response(502, { error: 'Não foi possível cadastrar a empresa no Asaas. Confira os dados cadastrais.' });
      }
      if (typeof customerResult.id !== 'string' || !customerResult.id) {
        console.error('Asaas customer response did not include an ID:', customerResult);
        return response(502, { error: 'O Asaas não retornou o identificador do cliente. Tente novamente mais tarde.' });
      }
      customerId = customerResult.id;
      const { error: customerUpdateError } = await database
        .from('empresas')
        .update({ asaas_customer_id: customerId })
        .eq('id', company.id);
      if (customerUpdateError) throw customerUpdateError;
    }

    const { data: pendingSubscription, error: pendingError } = await database
      .from('assinaturas')
      .insert({
        empresa_id: company.id,
        plano_id: plan.id,
        status: 'PENDING',
        billing_type: billingType,
        asaas_customer_id: customerId,
      })
      .select('id')
      .single();
    if (pendingError) throw pendingError;

    const subscriptionBody: Record<string, unknown> = {
      customer: customerId,
      billingType,
      value: Number(plan.preco_mensal),
      nextDueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      cycle: 'MONTHLY',
      description: `PDV ${plan.nome} - assinatura mensal`,
      externalReference: company.id,
    };
    if (billingType === 'CREDIT_CARD') {
      subscriptionBody.creditCardToken = creditCardToken;
      if (isRecord(body.creditCardHolderInfo)) {
        subscriptionBody.creditCardHolderInfo = body.creditCardHolderInfo;
      }
    }

    const asaasResponse = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: apiKey },
      body: JSON.stringify(subscriptionBody),
    });
    const subscriptionResult = await readJsonObject(asaasResponse);
    if (!asaasResponse.ok) {
      console.error('Asaas subscription creation failed:', subscriptionResult);
      const { error: cleanupError } = await database.from('assinaturas').delete().eq('id', pendingSubscription.id);
      if (cleanupError) console.error('Could not remove the failed pending subscription:', cleanupError);
      return response(502, { error: 'O Asaas não aceitou a assinatura. Confira os dados de pagamento e tente novamente.' });
    }
    if (typeof subscriptionResult.id !== 'string' || !subscriptionResult.id) {
      console.error('Asaas subscription response did not include an ID:', subscriptionResult);
      return response(502, { error: 'O Asaas não retornou o identificador da assinatura. Contate o suporte antes de tentar novamente.' });
    }

    const { error: subscriptionUpdateError } = await database.from('assinaturas')
      .update({
        asaas_subscription_id: subscriptionResult.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingSubscription.id);
    if (subscriptionUpdateError) {
      console.error('Asaas subscription created, but local synchronization failed:', subscriptionUpdateError);
      return response(502, { error: 'A assinatura foi enviada ao Asaas, mas não foi possível sincronizar o status. Contate o suporte antes de tentar novamente.' });
    }

    let paymentUrl: string | null = null;
    const paymentsResponse = await fetch(
      `${asaasBaseUrl}/subscriptions/${encodeURIComponent(subscriptionResult.id)}/payments?limit=1`,
      { headers: { access_token: apiKey } },
    );
    if (paymentsResponse.ok) {
      const payments = await readJsonObject(paymentsResponse);
      const firstPayment = Array.isArray(payments.data) ? payments.data[0] : null;
      const invoiceUrl = isRecord(firstPayment) ? firstPayment.invoiceUrl : null;
      if (typeof invoiceUrl === 'string' && invoiceUrl.startsWith('https://')) paymentUrl = invoiceUrl;
    } else {
      console.error('Asaas subscription created, but initial payment URL could not be loaded.');
    }

    return response(201, {
      configured: true,
      subscriptionId: subscriptionResult.id,
      status: 'PENDING',
      paymentUrl,
      message: 'Assinatura criada. O plano será ativado após a confirmação do primeiro pagamento.',
    });
  } catch (error) {
    console.error('Asaas subscription request failed:', error);
    return response(500, { error: error instanceof Error ? error.message : 'Não foi possível processar a assinatura.' });
  }
});
