# PDV-VS - Automação Comercial

Sistema de Ponto de Vêrgas / Vendas (PDV) moderno, responsivo e integrado em tempo real com o **Supabase**.

## Funcionalidades
- **Busca Rápida Inteligente:** Sugestões em tempo real ao digitar a partir de 4 caracteres.
- **Leitor de Código de Barras via Câmera:** Suporte completo integrado para celulares e computadores.
- **Gestão Completa de Estoque:** Painel dedicado para consultar, editar valores/quantidades e excluir produtos sem sair do app.
- **Baixa Automática:** Atualização instantânea no banco de dados do Supabase ao finalizar a venda.
- **Painel Administrativo Multi-dispositivo:** Sessão administrativa separada do login do operador, com status Realtime dos caixas cadastrados e indicadores diários de vendas e cancelamentos. Aplique em ordem as migrations `20261017170000_add_cash_item_cancellations.sql`, `20261017180000_add_per_user_active_sessions.sql` e `20261017190000_admin_cross_device_cash_visibility.sql`.
- **Sessões independentes com login único por usuário:** O administrador e os operadores têm autenticações separadas e cada usuário mantém somente o login mais recente; a migration de sessões ativas habilita a validação por dispositivo.
- **Visibilidade administrativa multi-dispositivo:** A migration de visibilidade libera a leitura de caixas, vendas, cancelamentos e operadores da própria empresa para o Admin e habilita as tabelas no Supabase Realtime.