// www/core/sessaoService.js

export async function transferirSessaoAutenticada(supabaseClient, destinationClient, user) {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session || session.user.id !== user.id) {
    throw new Error('Não foi possível obter a sessão autenticada para este usuário.');
  }

  const { error: transferError } = await destinationClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });
  if (transferError) throw transferError;

  return session;
}

function obterChavesSessao(escopo) {
  return {
    token: `vancely_sessao_${escopo}_token`,
    user: `vancely_sessao_${escopo}_user`
  };
}

export async function isolarSessaoAdministrativa(supabaseClient, adminClient, user, empresaId) {
  await transferirSessaoAutenticada(supabaseClient, adminClient, user);
  const token = await ativarSessaoUnica(adminClient, user.id, 'admin');
  if (!token) throw new Error('Não foi possível registrar a sessão administrativa neste dispositivo.');

  localStorage.setItem('vancely_admin_session', JSON.stringify({
    user_id: user.id,
    empresa_id: empresaId,
    email: user.email || ''
  }));
}

// Função para registar ou atualizar a sessão ativa no login
export async function ativarSessaoUnica(supabaseClient, userId, escopo = 'operador') {
  const tokenUnico = 'sessao_' + Date.now() + '_' + Math.random().toString(36).substring(2);

  // Insere ou atualiza a tabela sessoes_ativas com base no ID do utilizador
  const { error } = await supabaseClient
    .from('sessoes_ativas')
    .upsert(
      { 
        user_id: userId, 
        token_sessao: tokenUnico, 
        updated_at: new Date().toISOString() 
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Erro ao gravar sessão ativa:', error);
    return null;
  }

  const chaves = obterChavesSessao(escopo);
  sessionStorage.setItem(chaves.token, tokenUnico);
  sessionStorage.setItem(chaves.user, userId);

  if (escopo === 'operador') {
    localStorage.removeItem('token_sessao_ativo');
    localStorage.removeItem('user_id_ativo');
  }

  return tokenUnico;
}

// Função para verificar periodicamente se a sessão continua válida
export async function validarSessaoAtual(
  supabaseClient,
  escopo = 'operador',
  { exigirSessao = false, rotaLogin = '/modules/auth/auth.html' } = {}
) {
  const chaves = obterChavesSessao(escopo);
  let userId = sessionStorage.getItem(chaves.user);
  let tokenLocal = sessionStorage.getItem(chaves.token);

  if (!userId || !tokenLocal) {
    if (escopo === 'operador') {
      userId = localStorage.getItem('user_id_ativo');
      tokenLocal = localStorage.getItem('token_sessao_ativo');
      if (userId && tokenLocal) {
        sessionStorage.setItem(chaves.user, userId);
        sessionStorage.setItem(chaves.token, tokenLocal);
        localStorage.removeItem('user_id_ativo');
        localStorage.removeItem('token_sessao_ativo');
      }
    }
    if (!userId || !tokenLocal) {
      if (!exigirSessao) return true;
      window.location.href = rotaLogin;
      return false;
    }
  }

  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) {
    console.error(`Não foi possível verificar o usuário autenticado da sessão ${escopo}:`, sessionError);
    return true;
  }
  if (!session || session.user.id !== userId) {
    sessionStorage.removeItem(chaves.token);
    sessionStorage.removeItem(chaves.user);
    if (escopo === 'admin') localStorage.removeItem('vancely_admin_session');
    window.location.href = rotaLogin;
    return false;
  }

  const { data, error } = await supabaseClient
    .from('sessoes_ativas')
    .select('token_sessao')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`Não foi possível validar a sessão de ${escopo}; a validação será repetida:`, error);
    return true;
  }

  if (!data || data.token_sessao !== tokenLocal) {
    alert(`Sessão encerrada: este ${escopo === 'admin' ? 'administrador' : 'operador'} entrou em outro dispositivo.`);
    sessionStorage.removeItem(chaves.token);
    sessionStorage.removeItem(chaves.user);
    if (escopo === 'admin') localStorage.removeItem('vancely_admin_session');
    window.location.href = rotaLogin;
    return false;
  }

  return true;
}