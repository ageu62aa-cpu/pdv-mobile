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

function asBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function normalizeBaseUrl(value: string | undefined) {
  const base = (value || 'https://api.asaas.com/v3').replace(/\/+$/, '');
  if (!/^https:\/\/(api|api-sandbox)\.asaas\.com\/v3$/.test(base)) {
    throw new Error('ASAAS_API_URL deve apontar para a API oficial do Asaas.');
  }
  return base;
}

async function encryptApiKey(apiKey: string, encodedEncryptionKey: string) {
  const rawKey = fromBase64(encodedEncryptionKey);
  if (rawKey.length !== 32) throw new Error('ASAAS_CREDENTIALS_ENCRYPTION_KEY deve conter 32 bytes em Base64.');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(apiKey));
  return { ciphertext: asBase64(new Uint8Array(ciphertext)), iv: asBase64(iv) };
}

async function decryptApiKey(ciphertext: string, encodedIv: string, encodedEncryptionKey: string) {
  const rawKey = fromBase64(encodedEncryptionKey);
  if (rawKey.length !== 32) throw new Error('ASAAS_CREDENTIALS_ENCRYPTION_KEY deve conter 32 bytes em Base64.');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(encodedIv) },
    key,
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function readAsaasJson(response: Response) {
  const result: unknown = await response.json();
  if (!isRecord(result)) throw new Error('Resposta inválida recebida do Asaas.');
  return result;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('PDV Asaas function environment is not configured.');
    return response(503, { error: 'O serviço Pix está temporariamente indisponível.' });
  }
  if (!authorization?.startsWith('Bearer ')) return response(401, { error: 'Faça login para continuar.' });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return response(401, { error: 'Sua sessão expirou. Entre novamente.' });

  const database = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const payload: unknown = await request.json();
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return response(400, { error: 'Informe uma ação válida.' });
    }

    const email = user.email?.trim().toLowerCase() || '';
    const { data: memberships, error: membershipError } = await database
      .from('usuarios_empresas')
      .select('empresa_id, cargo')
      .eq('user_id', user.id);
    if (membershipError) throw membershipError;

    let companyId = typeof payload.empresaId === 'string' ? payload.empresaId : '';
    let membership = memberships?.find(item => item.empresa_id === companyId);
    let isAdmin = Boolean(membership && membership.cargo === 'admin_mercado');
    if (!companyId) {
      if (memberships?.length === 1) {
        companyId = memberships[0].empresa_id;
        membership = memberships[0];
        isAdmin = membership.cargo === 'admin_mercado';
      } else {
        const ownedById = await database.from('empresas').select('id').eq('id', user.id).maybeSingle();
        if (ownedById.error) throw ownedById.error;
        const ownedByEmailAdmin = !ownedById.data && email
          ? await database.from('empresas').select('id').eq('email_admin', email).limit(2)
          : null;
        if (ownedByEmailAdmin?.error) throw ownedByEmailAdmin.error;
        const ownedByEmail = !ownedById.data && !ownedByEmailAdmin?.data?.length && email
          ? await database.from('empresas').select('id').eq('email', email).limit(2)
          : null;
        if (ownedByEmail?.error) throw ownedByEmail.error;
        const matchingOwner = ownedById.data
          || (ownedByEmailAdmin?.data?.length === 1 ? ownedByEmailAdmin.data[0] : null)
          || (ownedByEmail?.data?.length === 1 ? ownedByEmail.data[0] : null);
        if (matchingOwner) {
          companyId = matchingOwner.id;
          isAdmin = true;
        }
      }
    }
    if (companyId && !isAdmin) {
      const companyResult = await database.from('empresas').select('id, email, email_admin')
        .eq('id', companyId).maybeSingle();
      if (companyResult.error) throw companyResult.error;
      const company = companyResult.data;
      isAdmin = Boolean(company && (company.id === user.id
        || company.email_admin?.trim().toLowerCase() === email
        || company.email?.trim().toLowerCase() === email));
    }
    if (!companyId || (!membership && !isAdmin)) {
      return response(403, { error: 'Sua conta não está vinculada a esta empresa.' });
    }
    if (payload.action === 'create_pix_sale' && membership?.cargo !== 'operador' && !isAdmin) {
      return response(403, { error: 'Seu perfil não está autorizado a registrar vendas nesta empresa.' });
    }

    const apiUrl = normalizeBaseUrl(Deno.env.get('ASAAS_API_URL'));

    if (payload.action === 'status') {
      if (!isAdmin) return response(403, { error: 'Somente o administrador pode consultar a conexão Asaas.' });
      const { data: account, error } = await database.from('empresas')
        .select('asaas_subaccount_id, gateway_modo, termos_asaas_aceitos')
        .eq('id', companyId).maybeSingle();
      if (error) throw error;
      const { data: activation, error: activationError } = await database
        .from('asaas_account_activations')
        .select('id, status, billing_type, payment_url, asaas_payment_id, created_at')
        .eq('empresa_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activationError) throw activationError;
      return response(200, {
        connected: Boolean(account?.asaas_subaccount_id),
        acceptedTerms: Boolean(account?.termos_asaas_aceitos),
        gatewayMode: account?.gateway_modo || 'SIMULADO',
        accountId: account?.asaas_subaccount_id || null,
        activation: activation ? {
          id: activation.id,
          status: activation.status,
          billingType: activation.billing_type,
          paymentUrl: activation.payment_url,
          paymentId: activation.asaas_payment_id,
        } : null,
      });
    }

    if (payload.action === 'activation_status') {
      if (!isAdmin) return response(403, { error: 'Somente o administrador pode consultar a ativação do Asaas.' });
      const activationId = typeof payload.activationId === 'string' ? payload.activationId : '';
      if (!activationId) return response(400, { error: 'Identificador da ativação inválido.' });
      const { data: activation, error } = await database.from('asaas_account_activations')
        .select('id, status, failure_message, billing_type, payment_url, asaas_payment_id')
        .eq('id', activationId)
        .eq('empresa_id', companyId)
        .maybeSingle();
      if (error) throw error;
      if (!activation) return response(404, { error: 'Ativação não encontrada.' });
      let pix: Record<string, unknown> | null = null;
      if (activation.status === 'PENDING_PAYMENT' && activation.billing_type === 'PIX'
          && activation.asaas_payment_id) {
        const platformApiKey = Deno.env.get('ASAAS_MASTER_API_KEY')?.trim();
        if (!platformApiKey) return response(503, { error: 'A integração Asaas não está configurada.' });
        const qrResponse = await fetch(
          `${apiUrl}/payments/${encodeURIComponent(activation.asaas_payment_id)}/pixQrCode`,
          { headers: { access_token: platformApiKey } },
        );
        const qrData = await readAsaasJson(qrResponse);
        if (!qrResponse.ok) throw new Error('Não foi possível recuperar o QR Pix desta ativação.');
        pix = qrData;
      }
      return response(200, {
        id: activation.id,
        status: activation.status,
        failure_message: activation.failure_message,
        billingType: activation.billing_type,
        paymentUrl: activation.payment_url,
        paymentId: activation.asaas_payment_id,
        pix,
      });
    }

    if (payload.action === 'set_asaas_real') {
      if (!isAdmin) return response(403, { error: 'Somente o administrador pode ativar os pagamentos Asaas.' });
      const { data: account, error } = await database.from('empresas')
        .select('asaas_subaccount_id, asaas_wallet_id, asaas_account_api_key, asaas_account_api_key_iv, termos_asaas_aceitos')
        .eq('id', companyId).maybeSingle();
      if (error) throw error;
      if (!account?.asaas_subaccount_id || !account.asaas_wallet_id
          || !account.asaas_account_api_key || !account.asaas_account_api_key_iv
          || !account.termos_asaas_aceitos) {
        return response(409, { error: 'Não há uma subconta Asaas ativa e autorizada para esta empresa.' });
      }
      const { error: updateError } = await database.from('empresas')
        .update({ gateway_modo: 'ASAAS_REAL' }).eq('id', companyId);
      if (updateError) throw updateError;
      return response(200, { updated: true, gatewayMode: 'ASAAS_REAL' });
    }

    if (payload.action === 'set_simulated') {
      if (!isAdmin) return response(403, { error: 'Somente o administrador pode alterar o modo de recebimento Pix.' });
      const { error } = await database.from('empresas')
        .update({ gateway_modo: 'SIMULADO' }).eq('id', companyId);
      if (error) throw error;
      return response(200, { updated: true, gatewayMode: 'SIMULADO' });
    }

    if (payload.action === 'start_account_activation') {
      if (!isAdmin) return response(403, { error: 'Somente o administrador da empresa pode ativar o Asaas.' });
      const platformApiKey = Deno.env.get('ASAAS_MASTER_API_KEY')?.trim();
      const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim();
      const encryptionKey = Deno.env.get('ASAAS_CREDENTIALS_ENCRYPTION_KEY')?.trim();
      if (!platformApiKey || !webhookToken || !encryptionKey) {
        return response(503, { error: 'Configure ASAAS_MASTER_API_KEY, ASAAS_WEBHOOK_TOKEN e ASAAS_CREDENTIALS_ENCRYPTION_KEY nos secrets do servidor.' });
      }
      if (payload.acceptTerms !== true) {
        return response(400, { error: 'É obrigatório aceitar os Termos de Uso antes de iniciar a ativação.' });
      }
      const { data: existingAccount, error: existingAccountError } = await database.from('empresas')
        .select('asaas_subaccount_id, asaas_wallet_id, asaas_account_api_key, asaas_account_api_key_iv, gateway_modo')
        .eq('id', companyId).maybeSingle();
      if (existingAccountError) throw existingAccountError;
      if (existingAccount?.asaas_subaccount_id && existingAccount.asaas_wallet_id
          && existingAccount.asaas_account_api_key && existingAccount.asaas_account_api_key_iv) {
        return response(200, {
          connected: true,
          gatewayMode: existingAccount.gateway_modo,
          message: 'Esta empresa já possui uma subconta Asaas conectada.',
        });
      }

      const requiredFields = ['name', 'email', 'cpfCnpj', 'mobilePhone', 'incomeValue', 'address', 'addressNumber', 'province', 'postalCode', 'city'];
      if (requiredFields.some(field => typeof payload[field] !== 'string' || !String(payload[field]).trim())) {
        return response(400, { error: 'Preencha todos os dados obrigatórios da conta e do endereço.' });
      }
      const cpfCnpj = String(payload.cpfCnpj).replace(/\D/g, '');
      const postalCode = String(payload.postalCode).replace(/\D/g, '');
      const mobilePhone = String(payload.mobilePhone).replace(/\D/g, '');
      if (payload.billingType !== 'PIX' && payload.billingType !== 'CREDIT_CARD') {
        return response(400, { error: 'Escolha Pix ou cartão para pagar a taxa de ativação.' });
      }
      if (![11, 14].includes(cpfCnpj.length) || postalCode.length !== 8 || mobilePhone.length < 10 || mobilePhone.length > 13) {
        return response(400, { error: 'Informe CPF/CNPJ, CEP e celular em formatos válidos.' });
      }
      const incomeValue = Number(payload.incomeValue);
      if (!Number.isFinite(incomeValue) || incomeValue <= 0) {
        return response(400, { error: 'Informe um faturamento mensal estimado válido.' });
      }
      const accountData = {
        name: String(payload.name).trim(),
        email: String(payload.email).trim(),
        cpfCnpj,
        mobilePhone,
        incomeValue,
        address: String(payload.address).trim(),
        addressNumber: String(payload.addressNumber).trim(),
        province: String(payload.province).trim(),
        postalCode,
        city: String(payload.city).trim(),
        ...(typeof payload.companyType === 'string' ? { companyType: payload.companyType } : {}),
      };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.email)) {
        return response(400, { error: 'Informe um e-mail válido para o titular da subconta.' });
      }

      const accountsResponse = await fetch(
        `${apiUrl}/accounts?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=100`,
        { headers: { access_token: platformApiKey } },
      );
      const accountsResult = await readAsaasJson(accountsResponse);
      if (!accountsResponse.ok) {
        console.error('Asaas subaccount duplicate lookup failed.');
        return response(502, { error: 'Não foi possível verificar se já existe uma subconta para este CPF/CNPJ.' });
      }
      const matchingAccounts = Array.isArray(accountsResult.data) ? accountsResult.data : [];
      if (matchingAccounts.length) {
        return response(409, {
          code: 'ASAAS_SUBACCOUNT_ALREADY_EXISTS',
          error: 'O Asaas já possui uma subconta com este CPF/CNPJ, mas ela não está vinculada a esta empresa. Nenhuma taxa foi cobrada. Contate o suporte para validar a titularidade e concluir a vinculação com segurança.',
        });
      }

      const acceptedAt = new Date().toISOString();
      const forwardedIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || '';
      const acceptedIp = /^[0-9a-fA-F:.]{1,45}$/.test(forwardedIp) ? forwardedIp : null;

      const { data: pendingActivation, error: pendingError } = await database
        .from('asaas_account_activations')
        .select('id, status, billing_type, asaas_payment_id, asaas_checkout_id, payment_url')
        .eq('empresa_id', companyId)
        .eq('status', 'PENDING_PAYMENT')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (pendingActivation) {
        if (pendingActivation.asaas_payment_id) {
          const qrResponse = await fetch(
            `${apiUrl}/payments/${encodeURIComponent(pendingActivation.asaas_payment_id)}/pixQrCode`,
            { headers: { access_token: platformApiKey } },
          );
          const qrData = await readAsaasJson(qrResponse);
          if (!qrResponse.ok) throw new Error('Não foi possível recuperar o Pix de ativação pendente.');
          return response(200, {
            activationId: pendingActivation.id,
            status: pendingActivation.status,
            billingType: pendingActivation.billing_type,
            paymentId: pendingActivation.asaas_payment_id,
            pix: qrData,
            message: 'Existe uma ativação pendente. Use a cobrança Pix já gerada para evitar duplicidade.',
          });
        }
        if (pendingActivation.asaas_checkout_id && pendingActivation.payment_url) {
          return response(200, {
            activationId: pendingActivation.id,
            status: pendingActivation.status,
            billingType: pendingActivation.billing_type,
            paymentUrl: pendingActivation.payment_url,
            message: 'Existe um checkout Asaas pendente. Continue o pagamento por esse link.',
          });
        }
        return response(409, { error: 'Já existe uma ativação em processamento. Aguarde alguns instantes e consulte novamente.' });
      }

      const { data: reviewActivation, error: reviewActivationError } = await database
        .from('asaas_account_activations')
        .select('id')
        .eq('empresa_id', companyId)
        .eq('status', 'REVIEW_REQUIRED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reviewActivationError) throw reviewActivationError;
      if (reviewActivation) {
        return response(409, {
          code: 'ASAAS_ACTIVATION_REVIEW_REQUIRED',
          error: 'A taxa desta ativação já foi confirmada, mas a criação/vinculação da subconta precisa de análise do suporte. Não será gerada outra cobrança.',
        });
      }

      const customerLookupResponse = await fetch(
        `${apiUrl}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=100`,
        { headers: { access_token: platformApiKey } },
      );
      const customerLookup = await readAsaasJson(customerLookupResponse);
      if (!customerLookupResponse.ok) {
        console.error('Asaas customer lookup failed.');
        return response(502, { error: 'Não foi possível verificar o cadastro de cobrança no Asaas.' });
      }
      const existingCustomers = Array.isArray(customerLookup.data) ? customerLookup.data : [];
      const matchingCustomer = existingCustomers.find(customer =>
        isRecord(customer) && customer.externalReference === companyId)
        || (existingCustomers.length === 1 ? existingCustomers[0] : null);
      if (existingCustomers.length > 1 && !matchingCustomer) {
        return response(409, { error: 'Há mais de um cliente com este CPF/CNPJ na conta master do Asaas. Contate o suporte antes de pagar para evitar duplicidade.' });
      }

      let customerId = isRecord(matchingCustomer) && typeof matchingCustomer.id === 'string'
        ? matchingCustomer.id
        : '';
      const customerBody = {
        name: accountData.name,
        email: accountData.email,
        cpfCnpj,
        phone: mobilePhone,
        address: accountData.address,
        addressNumber: accountData.addressNumber,
        province: accountData.province,
        postalCode,
        city: accountData.city,
        externalReference: companyId,
      };
      if (customerId) {
        const updateResponse = await fetch(`${apiUrl}/customers/${encodeURIComponent(customerId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', access_token: platformApiKey },
          body: JSON.stringify(customerBody),
        });
        if (!updateResponse.ok) {
          console.error('Asaas master customer update failed.');
          return response(502, { error: 'Não foi possível atualizar o cadastro de cobrança no Asaas.' });
        }
      } else {
        const createResponse = await fetch(`${apiUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', access_token: platformApiKey },
          body: JSON.stringify(customerBody),
        });
        const createdCustomer = await readAsaasJson(createResponse);
        if (!createResponse.ok || typeof createdCustomer.id !== 'string') {
          console.error('Asaas master customer creation failed:', createdCustomer.errors || 'missing customer id');
          return response(502, { error: 'Não foi possível cadastrar o titular para cobrar a ativação no Asaas.' });
        }
        customerId = createdCustomer.id;
      }

      const encryptedData = await encryptApiKey(JSON.stringify(accountData), encryptionKey);
      const { data: activation, error: activationInsertError } = await database
        .from('asaas_account_activations')
        .insert({
          empresa_id: companyId,
          billing_type: payload.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
          account_data_ciphertext: encryptedData.ciphertext,
          account_data_iv: encryptedData.iv,
          terms_accepted_at: acceptedAt,
          terms_accepted_ip: acceptedIp,
        })
        .select('id')
        .single();
      if (activationInsertError) {
        if (activationInsertError.code === '23505') {
          return response(409, { error: 'Já existe uma cobrança de ativação em andamento. Atualize o status antes de tentar novamente.' });
        }
        throw activationInsertError;
      }

      const callbackUrl = 'https://pdv-mobile.vercel.app/modules/admin/admin.html';
      if (payload.billingType === 'CREDIT_CARD') {
        const checkoutResponse = await fetch(`${apiUrl}/checkouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', access_token: platformApiKey },
          body: JSON.stringify({
            billingTypes: ['CREDIT_CARD'],
            chargeTypes: ['DETACHED'],
            minutesToExpire: 1440,
            externalReference: activation.id,
            customer: customerId,
            callback: {
              successUrl: callbackUrl,
              cancelUrl: callbackUrl,
              expiredUrl: callbackUrl,
            },
            items: [{
              name: 'Ativação de pagamentos automáticos Asaas',
              description: 'Taxa única de homologação, criação da subconta e ativação do gateway.',
              quantity: 1,
              value: 49.99,
            }],
          }),
        });
        const checkout = await readAsaasJson(checkoutResponse);
        if (!checkoutResponse.ok || typeof checkout.id !== 'string' || typeof checkout.link !== 'string') {
          console.error('Asaas activation checkout creation failed:', checkout.errors || 'missing checkout details');
          const { error: failedCheckoutError } = await database.from('asaas_account_activations').update({
            status: 'FAILED',
            failure_message: 'Não foi possível criar o checkout de ativação.',
            updated_at: new Date().toISOString(),
          }).eq('id', activation.id);
          if (failedCheckoutError) throw failedCheckoutError;
          return response(502, { error: 'O Asaas não conseguiu gerar o checkout seguro da taxa de ativação.' });
        }
        const { error: checkoutSaveError } = await database.from('asaas_account_activations')
          .update({
            asaas_checkout_id: checkout.id,
            payment_url: checkout.link,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activation.id);
        if (checkoutSaveError) throw checkoutSaveError;
        return response(201, {
          activationId: activation.id,
          status: 'PENDING_PAYMENT',
          billingType: 'CREDIT_CARD',
          paymentUrl: checkout.link,
          message: 'Conclua o pagamento no checkout oficial e seguro do Asaas. A subconta será criada após a confirmação.',
        });
      }

      const paymentResponse = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: platformApiKey },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: 49.99,
          dueDate: new Date().toISOString().slice(0, 10),
          description: 'Taxa de ativação de pagamentos automáticos Asaas',
          externalReference: activation.id,
        }),
      });
      const payment = await readAsaasJson(paymentResponse);
      if (!paymentResponse.ok || typeof payment.id !== 'string') {
        console.error('Asaas activation Pix creation failed:', payment.errors || 'missing payment id');
        const { error: failedPaymentError } = await database.from('asaas_account_activations').update({
          status: 'FAILED',
          failure_message: 'Não foi possível criar o Pix de ativação.',
          updated_at: new Date().toISOString(),
        }).eq('id', activation.id);
        if (failedPaymentError) throw failedPaymentError;
        return response(502, { error: 'O Asaas não conseguiu gerar o Pix da taxa de ativação.' });
      }
      const { error: paymentSaveError } = await database.from('asaas_account_activations')
        .update({
          asaas_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activation.id);
      if (paymentSaveError) throw paymentSaveError;
      const pixResponse = await fetch(`${apiUrl}/payments/${encodeURIComponent(payment.id)}/pixQrCode`, {
        headers: { access_token: platformApiKey },
      });
      const pix = await readAsaasJson(pixResponse);
      if (!pixResponse.ok) {
        console.error('Asaas activation Pix QR retrieval failed.');
        return response(502, { error: 'O Pix foi gerado, mas o QR Code ainda não está disponível. Reabra a ativação para recuperá-lo.' });
      }
      return response(201, {
        activationId: activation.id,
        status: 'PENDING_PAYMENT',
        billingType: 'PIX',
        paymentId: payment.id,
        pix,
        message: 'Pague a taxa única de ativação. A subconta será criada após a confirmação do Asaas.',
      });
    }

    if (payload.action === 'connect_account') {
      return response(410, { error: 'A criação direta da subconta foi desativada. Use o checkout da taxa de ativação Asaas.' });
    }

    if (payload.action === 'create_pix_sale') {
      const { data: settings, error: settingsError } = await database
        .from('empresas')
        .select('gateway_modo, asaas_subaccount_id, asaas_wallet_id, asaas_account_api_key, asaas_account_api_key_iv, termos_asaas_aceitos')
        .eq('id', companyId).maybeSingle();
      if (settingsError) throw settingsError;
      if (settings?.gateway_modo !== 'ASAAS_REAL' || !settings.termos_asaas_aceitos) {
        return response(409, { error: 'O Pix pelo Asaas não está selecionado para esta empresa.' });
      }
      const encryptionKey = Deno.env.get('ASAAS_CREDENTIALS_ENCRYPTION_KEY')?.trim();
      const splitWalletId = Deno.env.get('SPLIT_WALLET_ID')?.trim()
        || 'a0255af3-aa38-4e6e-af80-bb6da85ba6ef';
      if (!encryptionKey) {
        return response(503, { error: 'A integração Pix ainda não está completa. Contate o administrador do sistema.' });
      }
      if (!settings.asaas_subaccount_id || !settings.asaas_wallet_id || !settings.asaas_account_api_key || !settings.asaas_account_api_key_iv) {
        return response(409, { error: 'A conexão Asaas desta empresa está incompleta. Contate o administrador.' });
      }

      const customerName = typeof payload.customerName === 'string' ? payload.customerName.trim() : '';
      const customerCpf = typeof payload.customerCpf === 'string' ? payload.customerCpf.replace(/\D/g, '') : '';
      if (customerName.length < 2 || ![11, 14].includes(customerCpf.length)) {
        return response(400, { error: 'Informe o nome e o CPF/CNPJ do pagador para gerar o Pix.' });
      }
      if (!Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > 100) {
        return response(400, { error: 'A venda não contém uma lista válida de produtos.' });
      }
      const quantities = new Map<string, number>();
      for (const item of payload.items) {
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
          return response(400, { error: 'A venda contém um produto inválido.' });
        }
        const quantity = Number(item.qtd);
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) {
          return response(400, { error: 'A venda contém uma quantidade inválida.' });
        }
        quantities.set(item.id, (quantities.get(item.id) || 0) + quantity);
      }

      const { data: products, error: productsError } = await database.from('produtos')
        .select('id, nome, preco, estoque')
        .eq('empresa_id', companyId)
        .in('id', Array.from(quantities.keys()));
      if (productsError) throw productsError;
      if (!products || products.length !== quantities.size) {
        return response(409, { error: 'Um ou mais produtos não estão mais disponíveis para venda.' });
      }
      const sanitizedItems = products.map(product => ({
        id: String(product.id),
        nome: String(product.nome),
        qtd: quantities.get(String(product.id)) || 0,
        preco: Number(product.preco),
        preco_venda: Number(product.preco),
      }));
      if (sanitizedItems.some(item => !Number.isFinite(item.preco) || item.preco < 0)) {
        return response(409, { error: 'Um produto da venda está sem um preço válido.' });
      }
      const subtotal = Math.round(sanitizedItems.reduce((sum, item) => sum + item.qtd * item.preco, 0) * 100) / 100;
      const discount = Number(payload.discount || 0);
      if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
        return response(400, { error: 'O desconto da venda é inválido.' });
      }
      const amount = Math.round((subtotal - discount) * 100) / 100;
      if (amount <= 0) return response(400, { error: 'O total da cobrança precisa ser maior que zero.' });

      const { data: openCash, error: cashError } = await database.from('caixas')
        .select('id').eq('empresa_id', companyId).eq('user_id', user.id).eq('status', 'ABERTO')
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (cashError) throw cashError;
      if (!openCash) return response(409, { error: 'Abra seu caixa antes de iniciar uma cobrança Pix.' });

      const { data: pendingSale, error: saleError } = await database.from('vendas').insert({
        empresa_id: companyId,
        caixa_id: openCash.id,
        operador: user.email || user.id,
        operador_nome: typeof payload.operatorName === 'string' ? payload.operatorName.slice(0, 120) : user.email || 'Operador',
        valor_total: amount,
        valor_subtotal: subtotal,
        valor_juros: 0,
        itens: sanitizedItems,
        forma_pagamento: 'Pix Asaas',
        cliente_cpf: customerCpf,
        desconto: discount,
        status_pagamento: 'PENDENTE',
      }).select('id').single();
      if (saleError) throw saleError;

      let subaccountApiKey: string;
      try {
        subaccountApiKey = await decryptApiKey(settings.asaas_account_api_key, settings.asaas_account_api_key_iv, encryptionKey);
      } catch (error) {
        console.error('Could not decrypt Asaas subaccount credentials:', error);
        const { error: statusError } = await database.from('vendas')
          .update({ status_pagamento: 'FALHOU' }).eq('id', pendingSale.id);
        if (statusError) console.error('Could not mark the failed Asaas sale:', statusError);
        return response(503, { error: 'Não foi possível abrir a conexão segura com o Asaas. Contate o administrador.' });
      }
      const customerResponse = await fetch(`${apiUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: subaccountApiKey },
        body: JSON.stringify({
          name: customerName,
          cpfCnpj: customerCpf,
          externalReference: `${companyId}:${pendingSale.id}`,
        }),
      });
      const customer = await readAsaasJson(customerResponse);
      if (!customerResponse.ok || typeof customer.id !== 'string') {
        await database.from('vendas').update({ status_pagamento: 'FALHOU' }).eq('id', pendingSale.id);
        console.error('Asaas customer creation failed:', customer.errors || customer);
        return response(502, { error: 'O Asaas não aceitou os dados do pagador. Confira o CPF/CNPJ e tente novamente.' });
      }

      const paymentResponse = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: subaccountApiKey },
        body: JSON.stringify({
          customer: customer.id,
          billingType: 'PIX',
          value: amount,
          dueDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
          description: `Venda PDV ${pendingSale.id}`,
          externalReference: pendingSale.id,
          split: [{ walletId: splitWalletId, fixedValue: 0.10 }],
        }),
      });
      const payment = await readAsaasJson(paymentResponse);
      if (!paymentResponse.ok || typeof payment.id !== 'string') {
        await database.from('vendas').update({ status_pagamento: 'FALHOU' }).eq('id', pendingSale.id);
        console.error('Asaas Pix payment creation failed:', payment.errors || payment);
        return response(502, { error: 'O Asaas não conseguiu gerar a cobrança Pix. Nenhuma venda foi confirmada.' });
      }
      const { error: paymentIdError } = await database.from('vendas')
        .update({ asaas_payment_id: payment.id }).eq('id', pendingSale.id);
      if (paymentIdError) {
        console.error('Asaas payment exists but its local reference could not be stored:', paymentIdError);
        return response(502, { error: 'A cobrança foi criada, mas houve uma falha ao sincronizar seu identificador. Não gere outra cobrança; contate o suporte.' });
      }

      let pix: Record<string, unknown> = {};
      try {
        const qrResponse = await fetch(`${apiUrl}/payments/${encodeURIComponent(payment.id)}/pixQrCode`, {
          headers: { access_token: subaccountApiKey },
        });
        if (qrResponse.ok) pix = await readAsaasJson(qrResponse);
        else console.error('Asaas payment was created, but its Pix QR code could not be fetched.');
      } catch (error) {
        console.error('Asaas payment was created, but the QR request failed:', error);
      }

      return response(201, {
        saleId: pendingSale.id,
        paymentId: payment.id,
        amount,
        subtotal,
        discount,
        items: sanitizedItems,
        encodedImage: typeof pix.encodedImage === 'string' ? pix.encodedImage : null,
        payload: typeof pix.payload === 'string' ? pix.payload : null,
        paymentUrl: typeof payment.invoiceUrl === 'string' ? payment.invoiceUrl : null,
      });
    }

    return response(400, { error: 'Ação de integração Pix desconhecida.' });
  } catch (error) {
    console.error('PDV Asaas request failed:', error);
    return response(500, { error: error instanceof Error ? error.message : 'Não foi possível processar a solicitação Pix.' });
  }
});
