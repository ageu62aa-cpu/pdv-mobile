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
- **Planos e upgrade contextual:** O painel oferece a comparação dos cinco planos, atalhos de upgrade nos limites de produtos/operadores e paywall para períodos antigos do histórico.
- **Aceite legado compatível:** A migration de backfill marca tenants existentes como compatíveis com o acesso sem alterar sessões autenticadas ou registros históricos de aceite.
- **Identidade visual por empresa:** Administradores e operadores podem abrir o seletor pelo logo no cabeçalho, pré-visualizar seis cores e salvar a preferência do tenant.
- **Links legais no rodapé:** Frente de Caixa e Painel Administrativo oferecem links separados para Termos de Uso e Política de Privacidade.

## Banco de dados

Aplique todas as migrations de `supabase/migrations` em ordem lexicográfica pelo nome do arquivo. As migrations `20261018180000_fix_sale_rls_and_operator_membership.sql` e `20261018190000_add_saas_plans_terms_and_asaas.sql` dependem das migrations anteriores de cancelamentos, sessões, visibilidade administrativa e campos de cadastro da empresa. A migration `20261018193000_backfill_terms_acceptance_for_existing_tenants.sql` prepara a flag de aceite de contas legadas sem alterar sessões autenticadas ou exigir novo login.

Aplique as migrations até `20261018193000_backfill_terms_acceptance_for_existing_tenants.sql` antes de publicar a versão atualizada da Edge Function `empresa-signup`, que grava a flag de aceite explícita para novos cadastros.

A migration `20261019010000_add_tenant_brand_theme.sql` adiciona `empresas.theme_color` e a RPC protegida que valida o vínculo do usuário antes de atualizar a cor da empresa. Aplique-a para habilitar a persistência da personalização de marca.

A migration `20261020120000_add_pix_gateway_sales.sql` adiciona a configuração de Pix por empresa, o estado pendente das cobranças, o armazenamento criptografado de credenciais de subcontas e a confirmação idempotente do webhook. Aplique-a antes de publicar `pdv-asaas` e `asaas-webhook`.

As migrations `20261019192000_add_company_gateway_and_plan_fields.sql`, `20261020130000_migrate_legacy_asaas_gateway_accounts.sql`, `20261020140000_sync_asaas_subscription_plan_fields.sql` e `20261020150000_add_asaas_recurring_checkout.sql` adicionam os campos canônicos de modo de gateway, aceite do onboarding, credenciais criptografadas e plano, preservam subcontas já cadastradas, sincronizam plano/status após confirmação e permitem o checkout hospedado recorrente por cartão.

A migration SaaS instala os cinco planos, as assinaturas, os registros de aceite, os limites de produtos/operadores/dispositivos e as funções de sessão e entitlement. Ela remove sessões legadas sem tenant associado, pois elas não podem ser usadas como sessões válidas. Faça backup e valide em homologação antes de aplicar em produção.

## Edge Functions e Asaas

Este projeto é um PWA estático; a chave master do Asaas deve permanecer exclusivamente nos Supabase Secrets e nunca em `www/`, arquivos publicados, `.env.example` ou no repositório. Configure `ASAAS_MASTER_API_KEY` diretamente no painel de secrets do projeto Supabase. Ela é usada exclusivamente para mensalidades do SaaS e criação de subcontas de lojistas; cobranças de venda usam a chave da subconta, armazenada criptografada. Use `supabase/functions/.env.example` para os outros secrets e, se necessário para desenvolvimento local, crie `supabase/functions/.env.local` (não versionado) com `ASAAS_WEBHOOK_TOKEN`, `ASAAS_CREDENTIALS_ENCRYPTION_KEY`, `SPLIT_WALLET_ID` e `ASAAS_API_URL` (produção: `https://api.asaas.com/v3`; sandbox: `https://api-sandbox.asaas.com/v3`). Gere `ASAAS_CREDENTIALS_ENCRYPTION_KEY` aleatoriamente com 32 bytes codificados em Base64 e mantenha-a estável: ela protege as chaves de API das subcontas gravadas no banco. Nunca use as credenciais de produção que foram compartilhadas em conversas; revogue-as e gere novas.

Configure os secrets e publique as funções com a Supabase CLI:

```powershell
supabase secrets set --env-file supabase/functions/.env.local
supabase functions deploy empresa-signup
supabase functions deploy asaas
supabase functions deploy asaas-webhook
supabase functions deploy pdv-asaas
```

A função de webhook deve estar acessível em `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`, com o mesmo token configurado em `ASAAS_WEBHOOK_TOKEN`. Na conta master, habilite `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `CHECKOUT_PAID` e `SUBSCRIPTION_CREATED`: os dois últimos sincronizam o checkout recorrente por cartão. A conexão de cada subconta do PDV registra automaticamente o webhook para as vendas daquela loja (`PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`). A conta principal precisa ser uma pessoa jurídica habilitada pelo Asaas para criar subcontas; o titular da loja recebe o e-mail de ativação e cadastra os dados bancários diretamente no Asaas. Taxas de criação/uso de subconta dependem do contrato Asaas. O split de R$ 0,10 é enviado em cada cobrança Pix de venda para `SPLIT_WALLET_ID`; a assinatura do PDV permanece separada e é cobrada diretamente na conta master. A venda fica pendente até o webhook confirmar o pagamento e o estado operacional do caixa não é alterado para “PAGO”.

O QR Pix próprio é uma opção independente: o operador exibe o QR/chave configurado e confirma manualmente o recebimento. Cobranças manuais não usam o gateway nem o split. A tela administrativa informa quando a conexão da loja com o Asaas não está configurada.

PIX cria a assinatura e apresenta o link inicial de cobrança quando o Asaas o disponibiliza. Cartão abre uma página de checkout recorrente hospedada pelo Asaas; os dados do cartão não passam pelo PDV. A disponibilidade do checkout recorrente depende da habilitação da conta no Asaas.

O catálogo inclui cotas de emissão fiscal, mas este projeto ainda não possui fluxo de emissão NFC-e/NF-e para aplicar essas cotas. Os termos em `www/termos.html` são uma minuta e precisam de revisão jurídica. Sem uma integração fiscal habilitada, o comprovante impresso está identificado como documento não fiscal e não substitui documento fiscal obrigatório.