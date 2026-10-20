import { createClient } from '@supabase/supabase-js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function asBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function decryptValue(ciphertext: string, encodedIv: string, encodedKey: string) {
  const rawKey = fromBase64(encodedKey);
  if (rawKey.length !== 32) throw new Error('ASAAS_CREDENTIALS_ENCRYPTION_KEY must contain 32 bytes.');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(encodedIv) },
    key,
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function encryptValue(value: string, encodedKey: string) {
  const rawKey = fromBase64(encodedKey);
  if (rawKey.length !== 32) throw new Error('ASAAS_CREDENTIALS_ENCRYPTION_KEY must contain 32 bytes.');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  return { ciphertext: asBase64(new Uint8Array(ciphertext)), iv: asBase64(iv) };
}

async function readAsaasJson(result: Response) {
  const value: unknown = await result.json();
  if (!isRecord(value)) throw new Error('Invalid JSON response from Asaas.');
  return value;
}

function normalizeAsaasBaseUrl(value: string | undefined) {
  const base = (value || 'https://api.asaas.com/v3').replace(/\/+$/, '');
  if (!/^https:\/\/(api|api-sandbox)\.asaas\.com\/v3$/.test(base)) {
    throw new Error('ASAAS_API_URL must point to the official Asaas API.');
  }
  return base;
}

function isUuid(value: string | null | undefined) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function activatePaidAsaasAccount(
  database: ReturnType<typeof createClient>,
  activationId: string,
  paymentId: string | null,
) {
  const { data: claimData, error: claimError } = await database.rpc('pdv_claim_asaas_account_activation', {
    p_activation_id: activationId,
    p_payment_id: paymentId,
  });
  if (claimError) throw claimError;
  const claim = Array.isArray(claimData) ? claimData[0] : claimData;
  if (!isRecord(claim)) return { synchronized: false, ignored: true };
  if (claim.activation_status === 'ACTIVE') return { synchronized: true };
  if (claim.claimed !== true) {
    return { synchronized: claim.activation_status === 'CREATING_ACCOUNT', processing: true };
  }

  const { data: activation, error: activationError } = await database
    .from('asaas_account_activations')
    .select('terms_accepted_at, terms_accepted_ip')
    .eq('id', activationId)
    .single();
  if (activationError) throw activationError;
  const companyId = typeof claim.empresa_id === 'string' ? claim.empresa_id : '';
  const { data: company, error: companyError } = await database.from('empresas')
    .select('asaas_subaccount_id, asaas_wallet_id, asaas_account_api_key, asaas_account_api_key_iv')
    .eq('id', companyId)
    .single();
  if (companyError) throw companyError;
  if (company.asaas_subaccount_id && company.asaas_wallet_id
      && company.asaas_account_api_key && company.asaas_account_api_key_iv) {
    const { error } = await database.from('asaas_account_activations')
      .update({ status: 'ACTIVE', account_data_ciphertext: '', account_data_iv: '', updated_at: new Date().toISOString() })
      .eq('id', activationId);
    if (error) throw error;
    return { synchronized: true, alreadyConnected: true };
  }

  const encodedEncryptionKey = Deno.env.get('ASAAS_CREDENTIALS_ENCRYPTION_KEY')?.trim();
  const masterApiKey = Deno.env.get('ASAAS_MASTER_API_KEY')?.trim();
  const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim();
  if (!encodedEncryptionKey || !masterApiKey || !webhookToken) {
    throw new Error('Asaas activation secrets are not configured.');
  }
  const ciphertext = typeof claim.account_data_ciphertext === 'string' ? claim.account_data_ciphertext : '';
  const iv = typeof claim.account_data_iv === 'string' ? claim.account_data_iv : '';
  const decoded: unknown = JSON.parse(await decryptValue(ciphertext, iv, encodedEncryptionKey));
  if (!isRecord(decoded)) throw new Error('Stored Asaas account details are invalid.');
  const cpfCnpj = typeof decoded.cpfCnpj === 'string' ? decoded.cpfCnpj.replace(/\D/g, '') : '';
  if (![11, 14].includes(cpfCnpj.length)) throw new Error('Stored CPF/CNPJ is invalid.');

  const apiUrl = normalizeAsaasBaseUrl(Deno.env.get('ASAAS_API_URL'));
  const accountLookupResponse = await fetch(
    `${apiUrl}/accounts?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=100`,
    { headers: { access_token: masterApiKey } },
  );
  const accountLookup = await readAsaasJson(accountLookupResponse);
  if (!accountLookupResponse.ok) {
    const { error } = await database.from('asaas_account_activations').update({
      updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      failure_message: 'Transient Asaas duplicate lookup failure.',
    }).eq('id', activationId);
    if (error) throw error;
    throw new Error('Could not verify existing Asaas subaccounts.');
  }
  const existingAccounts = Array.isArray(accountLookup.data) ? accountLookup.data : [];
  if (existingAccounts.length) {
    const { error } = await database.from('asaas_account_activations').update({
      status: 'REVIEW_REQUIRED',
      failure_message: 'Já existe uma subconta Asaas com este CPF/CNPJ, mas sua chave privada não pode ser recuperada pela API.',
      updated_at: new Date().toISOString(),
    }).eq('id', activationId);
    if (error) throw error;
    return { synchronized: false, duplicateAccount: true };
  }

  const accountBody: Record<string, unknown> = {
    name: String(decoded.name || '').trim(),
    email: String(decoded.email || '').trim(),
    cpfCnpj,
    mobilePhone: String(decoded.mobilePhone || '').replace(/\D/g, ''),
    incomeValue: Number(decoded.incomeValue),
    address: String(decoded.address || '').trim(),
    addressNumber: String(decoded.addressNumber || '').trim(),
    province: String(decoded.province || '').trim(),
    postalCode: String(decoded.postalCode || '').replace(/\D/g, ''),
    webhooks: [{
      name: 'PDV Mobile - pagamentos Pix',
      url: `${Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '')}/functions/v1/asaas-webhook`,
      email: String(decoded.email || '').trim(),
      enabled: true,
      interrupted: false,
      authToken: webhookToken,
      sendType: 'SEQUENTIALLY',
      events: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'],
      apiVersion: 3,
    }],
  };
  if (['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'].includes(String(decoded.companyType))) {
    accountBody.companyType = decoded.companyType;
  }
  const accountResponse = await fetch(`${apiUrl}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', access_token: masterApiKey },
    body: JSON.stringify(accountBody),
  });
  const account = await readAsaasJson(accountResponse);
  if (!accountResponse.ok || typeof account.id !== 'string'
      || typeof account.walletId !== 'string' || typeof account.apiKey !== 'string') {
    if (Array.isArray(account.errors)) {
      const details = account.errors.filter(isRecord)
        .map(error => typeof error.description === 'string' ? error.description : '')
        .filter(Boolean).join(' ').slice(0, 500);
      console.error('Asaas account activation failed:', details || 'missing required account credentials');
      if (/already|exist|cadastrad/i.test(details)) {
        const { error } = await database.from('asaas_account_activations').update({
          status: 'REVIEW_REQUIRED',
          failure_message: 'O Asaas informa que já existe uma subconta com os dados informados. Contate o suporte.',
          updated_at: new Date().toISOString(),
        }).eq('id', activationId);
        if (error) throw error;
        return { synchronized: false, duplicateAccount: true };
      }
    } else {
      console.error('Asaas account activation failed: invalid or incomplete response.');
    }
    if (accountResponse.status >= 400 && accountResponse.status < 500) {
      const { error } = await database.from('asaas_account_activations').update({
        status: 'REVIEW_REQUIRED',
        failure_message: 'A taxa foi confirmada, mas o Asaas exige análise dos dados antes de criar a subconta. Não pague novamente; contate o suporte.',
        updated_at: new Date().toISOString(),
      }).eq('id', activationId);
      if (error) throw error;
      return { synchronized: false, reviewRequired: true };
    }
    const { error: retryStateError } = await database.from('asaas_account_activations').update({
      updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      failure_message: 'Falha temporária ao criar a subconta Asaas.',
    }).eq('id', activationId);
    if (retryStateError) throw retryStateError;
    throw new Error('Asaas could not create the subaccount after confirming the activation fee.');
  }

  const encryptedApiKey = await encryptValue(account.apiKey, encodedEncryptionKey);
  const acceptedIp = typeof activation.terms_accepted_ip === 'string' ? activation.terms_accepted_ip : null;
  const { error: companySaveError } = await database.from('empresas').update({
    asaas_subaccount_id: account.id,
    asaas_wallet_id: account.walletId,
    asaas_account_api_key: encryptedApiKey.ciphertext,
    asaas_account_api_key_iv: encryptedApiKey.iv,
    gateway_modo: 'ASAAS_REAL',
    termos_asaas_aceitos: true,
    termos_asaas_data_aceite: activation.terms_accepted_at,
    termos_asaas_ip_aceite: acceptedIp,
    nome_empresa: accountBody.name,
    cnpj: cpfCnpj,
    email_admin: accountBody.email,
    whatsapp: accountBody.mobilePhone,
    endereco: accountBody.address,
    numero: accountBody.addressNumber,
    bairro: accountBody.province,
    cep: accountBody.postalCode,
    cidade: String(decoded.city || '').trim(),
    tipo_empresa: typeof decoded.companyType === 'string' ? decoded.companyType : null,
    faturamento_mensal_estimado: Number(decoded.incomeValue),
  }).eq('id', companyId);
  if (companySaveError) {
    console.error('Asaas subaccount was created but the local company could not be synchronized.');
    await database.from('asaas_account_activations').update({
      status: 'REVIEW_REQUIRED',
      failure_message: 'A subconta foi criada, mas a vinculação local falhou. Contate o suporte.',
      updated_at: new Date().toISOString(),
    }).eq('id', activationId);
    throw new Error('Could not securely save the Asaas subaccount credentials.');
  }

  const { error: activationSaveError } = await database.from('asaas_account_activations').update({
    status: 'ACTIVE',
    account_data_ciphertext: '',
    account_data_iv: '',
    failure_message: null,
    updated_at: new Date().toISOString(),
  }).eq('id', activationId);
  if (activationSaveError) throw activationSaveError;
  return { synchronized: true, accountId: account.id };
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim();
  const receivedToken = request.headers.get('asaas-access-token') || '';
  if (!expectedToken || !sameSecret(receivedToken, expectedToken)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase service environment is not configured.');
    return new Response('Service unavailable', { status: 503 });
  }

  try {
    const event: unknown = await request.json();
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return new Response('Invalid webhook payload', { status: 400 });
    }
    const payload = event as Record<string, unknown>;
    if (payload.event === 'SUBSCRIPTION_CREATED') {
      const subscription = payload.subscription;
      if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
        return Response.json({ received: true, ignored: true });
      }
      const subscriptionData = subscription as Record<string, unknown>;
      const externalReference = typeof subscriptionData.externalReference === 'string'
        ? subscriptionData.externalReference
        : '';
      const subscriptionId = typeof subscriptionData.id === 'string' ? subscriptionData.id : '';
      if (!externalReference || !subscriptionId) {
        return Response.json({ received: true, ignored: true });
      }

      const database = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await database.rpc('pdv_link_asaas_checkout_subscription', {
        p_external_reference: externalReference,
        p_asaas_subscription_id: subscriptionId,
      });
      if (error) throw error;
      if (!data) console.warn('Asaas subscription event did not match a pending checkout:', externalReference);
      return Response.json({ received: true, synchronized: Boolean(data) });
    }

    if (payload.event === 'CHECKOUT_PAID') {
      const checkout = payload.checkout;
      if (!checkout || typeof checkout !== 'object' || Array.isArray(checkout)) {
        return Response.json({ received: true, ignored: true });
      }
      const checkoutData = checkout as Record<string, unknown>;
      const checkoutId = typeof checkoutData.id === 'string' ? checkoutData.id : '';
      const externalReference = typeof checkoutData.externalReference === 'string'
        ? checkoutData.externalReference
        : null;
      if (!checkoutId) return Response.json({ received: true, ignored: true });

      const database = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      let activationQuery = isUuid(externalReference)
        ? database.from('asaas_account_activations')
          .select('id, status, billing_type, asaas_checkout_id')
          .eq('id', externalReference)
          .maybeSingle()
        : database.from('asaas_account_activations')
          .select('id, status, billing_type, asaas_checkout_id')
          .eq('asaas_checkout_id', checkoutId)
          .maybeSingle();
      let { data: activation, error: activationError } = await activationQuery;
      if (activationError) throw activationError;
      if (!activation && isUuid(externalReference)) {
        const byCheckout = await database.from('asaas_account_activations')
          .select('id, status, billing_type, asaas_checkout_id')
          .eq('asaas_checkout_id', checkoutId)
          .maybeSingle();
        activation = byCheckout.data;
        activationError = byCheckout.error;
        if (activationError) throw activationError;
      }
      if (activation) {
        const items = Array.isArray(checkoutData.items) ? checkoutData.items : [];
        const checkoutTotal = items.reduce((total, item) => {
          if (!isRecord(item)) return Number.NaN;
          return total + Number(item.quantity) * Number(item.value);
        }, 0);
        if (activation.billing_type === 'CREDIT_CARD'
            && Number.isFinite(checkoutTotal) && Math.abs(checkoutTotal - 49.99) < 0.005
            && (!activation.asaas_checkout_id || activation.asaas_checkout_id === checkoutId)) {
          const result = await activatePaidAsaasAccount(database, activation.id, null);
          return Response.json({ received: true, activation: true, ...result });
        }
        console.error('Paid Asaas activation checkout did not match the expected fee:', checkoutId);
        return Response.json({ received: true, synchronized: false });
      }
      const { data, error } = await database.rpc('pdv_activate_asaas_checkout', {
        p_checkout_id: checkoutId,
        p_external_reference: externalReference,
      });
      if (error) throw error;
      if (!data) console.warn('Paid Asaas checkout did not match a pending subscription:', checkoutId);
      return Response.json({ received: true, synchronized: Boolean(data) });
    }

    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(String(payload.event))) {
      return Response.json({ received: true, ignored: true });
    }
    if (!payload.payment || typeof payload.payment !== 'object' || Array.isArray(payload.payment)) {
      return Response.json({ received: true, ignored: true });
    }
    const database = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const payment = payload.payment as Record<string, unknown>;
    const paymentId = String(payment.id || '');
    const subscriptionId = String(payment.subscription || '');
    if (!paymentId) return Response.json({ received: true, ignored: true });

    if (subscriptionId) {
      const { data, error } = await database.rpc('pdv_activate_subscription_from_asaas', {
        p_asaas_subscription_id: subscriptionId,
        p_payment_id: paymentId,
      });
      if (error) throw error;
      if (!data) console.error('Asaas paid event did not match a local subscription:', subscriptionId);
      return Response.json({ received: true, synchronized: Boolean(data) });
    }

    const externalReference = String(payment.externalReference || '');
    const amount = Number(payment.value);
    let activation: {
      id: string;
      status: string;
      billing_type: string;
      asaas_payment_id: string | null;
    } | null = null;
    if (isUuid(externalReference)) {
      const { data, error } = await database
        .from('asaas_account_activations')
        .select('id, status, billing_type, asaas_payment_id')
        .eq('id', externalReference)
        .maybeSingle();
      if (error) throw error;
      activation = data;
    }
    if (activation) {
      if (activation.billing_type !== 'PIX' || Math.abs(amount - 49.99) >= 0.005
          || (activation.asaas_payment_id && activation.asaas_payment_id !== paymentId)) {
        console.error('Asaas activation payment did not match the expected amount or method:', paymentId);
        return Response.json({ received: true, synchronized: false });
      }
      const result = await activatePaidAsaasAccount(database, activation.id, paymentId);
      return Response.json({ received: true, activation: true, ...result });
    }
    if (!externalReference || !Number.isFinite(amount)) {
      console.error('Asaas sale payment event is missing its reference or amount:', paymentId);
      return Response.json({ received: true, synchronized: false });
    }
    const { data, error } = await database.rpc('pdv_confirm_asaas_pix_sale', {
      p_payment_id: paymentId,
      p_external_reference: externalReference,
      p_amount: amount,
    });
    if (error) throw error;
    if (!data) console.warn('Asaas paid event did not match a pending sale:', externalReference);
    return Response.json({ received: true, synchronized: Boolean(data) });
  } catch (error) {
    console.error('Asaas webhook processing failed:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
