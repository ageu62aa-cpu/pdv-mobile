// www/core/sessaoService.js

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
    localStorage.clear();
    window.location.href = '/modules/auth/auth.html'; // Redireciona para o login
    return false;
  }

  return true;
}