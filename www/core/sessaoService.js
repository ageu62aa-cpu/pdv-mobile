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

export async function isolarSessaoAdministrativa(supabaseClient, adminClient, user, empresaId) {
  await transferirSessaoAutenticada(supabaseClient, adminClient, user);

  localStorage.setItem('vancely_admin_session', JSON.stringify({
    user_id: user.id,
    empresa_id: empresaId,
    email: user.email || ''
  }));
}

// Função para registar ou atualizar a sessão ativa no login
export async function ativarSessaoUnica(supabaseClient, userId) {
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

  // Guarda o token localmente no navegador do dispositivo/caixa atual
  localStorage.setItem('token_sessao_ativo', tokenUnico);
  localStorage.setItem('user_id_ativo', userId);

  return tokenUnico;
}

// Função para verificar periodicamente se a sessão continua válida
export async function validarSessaoAtual(supabaseClient) {
  const userId = localStorage.getItem('user_id_ativo');
  const tokenLocal = localStorage.getItem('token_sessao_ativo');

  if (!userId || !tokenLocal) return true; // Se não estiver logado, deixa o fluxo normal

  const { data, error } = await supabaseClient
    .from('sessoes_ativas')
    .select('token_sessao')
    .eq('user_id', userId)
    .single();

  if (error || !data || data.token_sessao !== tokenLocal) {
    // Alguém fez login noutro lugar! O token mudou na base de dados.
    alert('Sessão encerrada: esta conta foi aberta noutra máquina ou caixa.');
    const { error: logoutError } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (logoutError) console.error('Não foi possível encerrar a sessão local do operador:', logoutError);
    localStorage.removeItem('token_sessao_ativo');
    localStorage.removeItem('user_id_ativo');
    window.location.href = '/modules/auth/auth.html'; // Redireciona para o login
    return false;
  }

  return true;
}