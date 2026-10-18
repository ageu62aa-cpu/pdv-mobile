# PDV-VS - Automação Comercial

Sistema de Ponto de Vêrgas / Vendas (PDV) moderno, responsivo e integrado em tempo real com o **Supabase**.

## Funcionalidades
- **Busca Rápida Inteligente:** Sugestões em tempo real ao digitar a partir de 4 caracteres.
- **Leitura de Código de Barras:** Compatível com pistolas USB/Bluetooth (entrada como teclado) no cadastro e no caixa, além do leitor de câmera em celulares e computadores.
- **Gestão Completa de Estoque:** Painel dedicado para consultar, editar valores/quantidades e excluir produtos sem sair do app.
- **Baixa Automática:** Atualização instantânea no banco de dados do Supabase ao finalizar a venda.
- **Painel Administrativo Multi-dispositivo:** Sessão administrativa separada do login do operador, com cadastro de operadores vinculados à empresa do administrador, status Realtime dos caixas e indicadores diários de vendas e cancelamentos.
- **Sessões independentes com login único por usuário:** O administrador e os operadores têm autenticações separadas e cada usuário mantém somente o login mais recente; a migration de sessões ativas habilita a validação por dispositivo.
- **Visibilidade administrativa multi-dispositivo:** A migration de visibilidade libera a leitura de caixas, vendas, cancelamentos e operadores da própria empresa para o Admin e habilita as tabelas no Supabase Realtime.

## Banco de dados

Aplique todas as migrations de `supabase/migrations` em ordem lexicográfica pelo nome do arquivo. As migrations `20261018180000_fix_sale_rls_and_operator_membership.sql` e `20261018190000_add_saas_plans_terms_and_asaas.sql` dependem das migrations anteriores de cancelamentos, sessões, visibilidade administrativa e campos de cadastro da empresa.

A migration SaaS instala os cinco planos, as assinaturas, os registros de aceite, os limites de produtos/operadores/dispositivos e as funções de sessão e entitlement. Ela remove sessões legadas sem tenant associado, pois elas não podem ser usadas como sessões válidas. Faça backup e valide em homologação antes de aplicar em produção.

## Edge Functions e Asaas

Este projeto é um PWA estático; a chave do Asaas deve permanecer exclusivamente nos secrets das Supabase Edge Functions. Nunca coloque `ASAAS_API_KEY` no código de `www/`, em arquivos publicados ou no repositório. Use `supabase/functions/.env.example` como referência e crie um arquivo local não versionado `supabase/functions/.env.local`, preenchendo `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e, opcionalmente, `ASAAS_API_URL` (produção: `https://api.asaas.com/v3`; sandbox: `https://api-sandbox.asaas.com/v3`).

Configure os secrets e publique as funções com a Supabase CLI:

```powershell
supabase secrets set --env-file supabase/functions/.env.local
supabase functions deploy empresa-signup
supabase functions deploy asaas
supabase functions deploy asaas-webhook
```

A função de webhook deve ser cadastrada no painel Asaas como `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`, com o mesmo token configurado em `ASAAS_WEBHOOK_TOKEN`, para os eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`. A tela administrativa informa quando a chave da API não está configurada.

PIX cria a assinatura e apresenta o link inicial de cobrança quando o Asaas o disponibiliza. O backend aceita token de cartão, mas a tela ainda não integra uma etapa de tokenização segura do SDK/fluxo oficial do Asaas; não envie número completo do cartão ou CVV ao PDV. Em produção, confirme com o Asaas a habilitação de tokenização antes de disponibilizar a opção de cartão.

O catálogo inclui cotas de emissão fiscal, mas este projeto ainda não possui fluxo de emissão NFC-e/NF-e para aplicar essas cotas. Os termos em `www/termos.html` são uma minuta e precisam de revisão jurídica. Sem uma integração fiscal habilitada, o comprovante impresso está identificado como documento não fiscal e não substitui documento fiscal obrigatório.