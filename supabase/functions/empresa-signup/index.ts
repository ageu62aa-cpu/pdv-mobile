import { createClient } from '@supabase/supabase-js';

const termsVersion = '2026-10-18';
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

function normalizeIpAddress(value: string | null) {
  if (!value) return null;
  if (/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value)) {
    return value;
  }
  try {
    const hostname = new URL(`http://[${value}]/`).hostname;
    return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : null;
  } catch {
    return null;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Supabase service environment is not configured.');
    return response(503, { error: 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.' });
  }

  const database = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const companyName = String(body.nomeEmpresa || '').trim();
    const contactName = String(body.responsavel || '').trim();
    const requiredFields = [
      'cnpj', 'whatsapp', 'cep', 'endereco', 'numero', 'cidade', 'estado',
    ] as const;

    if (body.acceptTerms !== true || body.termsVersion !== termsVersion) {
      return response(400, { error: 'É necessário aceitar a versão vigente dos Termos e da Política de Privacidade.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || !companyName || !contactName) {
      return response(400, { error: 'Confira o e-mail, a senha e os dados obrigatórios da empresa.' });
    }
    if (requiredFields.some(field => !String(body[field] || '').trim())) {
      return response(400, { error: 'Preencha todos os dados obrigatórios da empresa.' });
    }

    const { data: userData, error: userError } = await authClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: contactName, terms_version: termsVersion } },
    });
    if (userError) {
      return response(400, { error: userError.message });
    }
    if (!userData.user || userData.user.identities?.length === 0) {
      return response(400, { error: 'Este e-mail já está cadastrado. Entre na conta ou use outro e-mail.' });
    }
    createdUserId = userData.user.id;
    createdCompanyId = userData.user.id;

    const acceptedAt = new Date().toISOString();
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipHeader = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-real-ip')
      || forwardedFor?.split(',')[0]?.trim()
      || null;
    const ip = normalizeIpAddress(ipHeader);
    const userAgent = request.headers.get('user-agent');

    const { error: companyError } = await database.from('empresas').insert({
      id: createdCompanyId,
      nome_mercado: companyName,
      nome_empresa: companyName,
      cnpj: String(body.cnpj).trim(),
      whatsapp: String(body.whatsapp).trim(),
      cep: String(body.cep).trim(),
      endereco: String(body.endereco).trim(),
      numero: String(body.numero).trim(),
      cidade: String(body.cidade).trim(),
      estado: String(body.estado).trim(),
      responsavel: contactName,
      nome_responsavel: contactName,
      email,
      email_admin: email,
      plano: 'gratis',
      plano_id: 'gratis',
      status_assinatura: 'ATIVO',
      termos_versao_aceite: termsVersion,
      termos_aceitos_em: acceptedAt,
      termos_aceite_ip: ip,
    });
    if (companyError) throw companyError;

    const { error: consentError } = await database.from('termos_aceites').insert({
      user_id: createdUserId,
      empresa_id: createdCompanyId,
      versao: termsVersion,
      aceito_em: acceptedAt,
      ip,
      user_agent: userAgent,
    });
    if (consentError) throw consentError;

    return response(201, { ok: true, emailConfirmationRequired: true });
  } catch (error) {
    console.error('Company registration failed:', error);
    if (createdCompanyId) {
      const { error: rollbackError } = await database.from('empresas').delete().eq('id', createdCompanyId);
      if (rollbackError) console.error('Could not rollback the incomplete company record:', rollbackError);
    }
    if (createdUserId) {
      const { error: rollbackError } = await database.auth.admin.deleteUser(createdUserId);
      if (rollbackError) console.error('Could not rollback the incomplete auth user:', rollbackError);
    }
    return response(500, { error: 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.' });
  }
});
