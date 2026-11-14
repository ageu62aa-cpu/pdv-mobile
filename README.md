# PDV-VS - Automação Comercial

Sistema de Ponto de Vêrgas / Vendas (PDV) moderno, responsivo e integrado em tempo real com o **Supabase**.

## Funcionalidades
- **Busca Rápida Inteligente:** Sugestões em tempo real ao digitar a partir de 4 caracteres.
- **Leitura de Código de Barras:** Compatível com pistolas USB/Bluetooth configuradas como teclado e finalização da leitura com Enter. O caixa processa leituras em sequência sem perder códigos enquanto consulta o servidor; o cadastro mantém o campo de código pronto para leituras repetidas em produtos novos e editados. Como esses leitores enviam teclas ao navegador, o sistema reconhece as leituras, mas não consegue identificar cada aparelho físico individualmente. Também há leitor de câmera em celulares e computadores.
- **Gestão Completa de Estoque:** Painel dedicado para consultar, editar valores/quantidades e excluir produtos sem sair do app.
- **Baixa Automática:** Atualização instantânea no banco de dados do Supabase ao finalizar a venda.
- **Painel Administrativo Multi-dispositivo:** Sessão administrativa separada do login do operador, com cadastro de operadores vinculados à empresa do administrador, status Realtime dos caixas e indicadores diários de vendas e cancelamentos.
- **Sessões independentes com login único por usuário:** O administrador e os operadores têm autenticações separadas e cada usuário mantém somente o login mais recente; a migration de sessões ativas habilita a validação por dispositivo.
- **Visibilidade administrativa multi-dispositivo:** A migration de visibilidade libera a leitura de caixas, vendas, cancelamentos e operadores da própria empresa para o Admin e habilita as tabelas no Supabase Realtime.
- **Planos e upgrade contextual:** O painel compara os quatro planos, oferece blocos mensais de produtos recorrentes pelo Asaas e apresenta atalhos de upgrade nos limites de produtos/operadores e paywall para períodos antigos do histórico.
- **Aceite legado compatível:** A migration de backfill marca tenants existentes como compatíveis com o acesso sem alterar sessões autenticadas ou registros históricos de aceite.
- **Identidade visual por empresa:** Administradores e operadores podem abrir o seletor pelo logo circular no cabeçalho, pré-visualizar nove temas e salvar a preferência do tenant; Preto e Ouro mantém a interface escura com dourado nos destaques, Vermelho usa acentos bordô em superfícies claras, e os três temas novos usam mascotes quadrados próprios no cabeçalho e na marca d'água do carrinho, separados da arte integral dos cards.
- **Links legais no rodapé:** Frente de Caixa e Painel Administrativo oferecem links separados para Termos de Uso e Política de Privacidade.

## Banco de dados

Aplique todas as migrations de `supabase/migrations` em ordem lexicográfica pelo nome do arquivo. As migrations `20261018180000_fix_sale_rls_and_operator_membership.sql` e `20261018190000_add_saas_plans_terms_and_asaas.sql` dependem das migrations anteriores de cancelamentos, sessões, visibilidade administrativa e campos de cadastro da empresa. A migration `20261018193000_backfill_terms_acceptance_for_existing_tenants.sql` prepara a flag de aceite de contas legadas sem alterar sessões autenticadas ou exigir novo login.

A migration `20261114120000_fix_theme_color_validation.sql` atualiza a RPC `vancely_update_theme_color` para normalizar e validar nomes de tema em português ou inglês, migrar valores legados e restringir `empresas.theme_color` às seis cores então existentes. As migrations `20261115120000_add_black_gold_theme.sql`, `20261115130000_add_blue_ice_theme.sql` e `20261115140000_add_red_theme.sql` adicionam Preto e Ouro, Azul-Branco Gelo e Vermelho à validação da RPC e à constraint da tabela. Aplique as migrations em ordem para disponibilizar os nove temas.

Aplique as migrations até `20261018193000_backfill_terms_acceptance_for_existing_tenants.sql` antes de publicar a versão atualizada da Edge Function `empresa-signup`, que grava a flag de aceite explícita para novos cadastros.

A migration `20261019010000_add_tenant_brand_theme.sql` adiciona `empresas.theme_color` e a RPC protegida que valida o vínculo do usuário antes de atualizar a cor da empresa. Aplique-a para habilitar a persistência da personalização de marca.

A migration `20261020120000_add_pix_gateway_sales.sql` adiciona a configuração de Pix por empresa, o estado pendente das cobranças, o armazenamento criptografado de credenciais de subcontas e a confirmação idempotente do webhook. Aplique-a antes de publicar `pdv-asaas` e `asaas-webhook`.

As migrations `20261019192000_add_company_gateway_and_plan_fields.sql`, `20261020130000_migrate_legacy_asaas_gateway_accounts.sql`, `20261020140000_sync_asaas_subscription_plan_fields.sql` e `20261020150000_add_asaas_recurring_checkout.sql` adicionam os campos canônicos de modo de gateway, aceite do onboarding, credenciais criptografadas e plano, preservam subcontas já cadastradas, sincronizam plano/status após confirmação e permitem o checkout hospedado recorrente por cartão.

A migration `20261020160000_default_legacy_companies_to_free.sql` coloca no plano Grátis as empresas legadas que não tenham uma assinatura paga `ACTIVE`/`TRIALING`. Os cadastros novos também iniciam explicitamente no Grátis; produtos existentes são preservados, mas a cota gratuita de novos cadastros é aplicada até o upgrade.

A migration `20261020170000_repair_plan_catalog.sql` completa o esquema público de `planos`, popula o catálogo e mapeia as antigas referências Bronze/Prata. A migration `20261111210000_update_retail_plan_catalog.sql` atualiza os planos para Grátis/Bronze/Prata/Ouro, com os novos preços e limites, e desativa Diamante. A migration `20261111220000_add_recurring_product_blocks.sql` adiciona os blocos mensais de produtos e ajusta o cálculo e a validação do limite no banco. A migration `20261109200000_disable_fiscal_invoicing.sql` zera as cotas fiscais legadas dos planos; o PDV não emite notas fiscais.

A migration `20261020180000_add_asaas_activation_checkout.sql` cria o armazenamento cifrado e os estados idempotentes da taxa de ativação Asaas. Aplique-a antes de publicar `pdv-asaas` e `asaas-webhook`.

A migration SaaS instala o catálogo inicial de cinco planos, as assinaturas, os registros de aceite, os limites de produtos/operadores/dispositivos e as funções de sessão e entitlement. A migration de atualização do catálogo mantém somente quatro planos ativos. A migration SaaS remove sessões legadas sem tenant associado, pois elas não podem ser usadas como sessões válidas. Faça backup e valide em homologação antes de aplicar em produção.

## Edge Functions e Asaas

Este projeto é um PWA estático; a chave master do Asaas deve permanecer exclusivamente nos Supabase Secrets e nunca em `www/`, arquivos publicados, `.env.example` ou no repositório. Configure `ASAAS_MASTER_API_KEY` diretamente no painel de secrets do projeto Supabase. Ela é usada exclusivamente para mensalidades do SaaS, cobrança da taxa de ativação e criação de subcontas de lojistas; cobranças de venda usam a chave da subconta, armazenada criptografada. Use `supabase/functions/.env.example` para os outros secrets e, se necessário para desenvolvimento local, crie `supabase/functions/.env.local` (não versionado) com `ASAAS_WEBHOOK_TOKEN`, `ASAAS_CREDENTIALS_ENCRYPTION_KEY`, `SPLIT_WALLET_ID` e `ASAAS_API_URL` (produção: `https://api.asaas.com/v3`; sandbox: `https://api-sandbox.asaas.com/v3`). Gere `ASAAS_CREDENTIALS_ENCRYPTION_KEY` aleatoriamente com 32 bytes codificados em Base64 e mantenha-a estável: ela protege as chaves de API das subcontas e os dados temporários de onboarding gravados no banco. Os dados temporários são removidos após ativação. Nunca use as credenciais de produção que foram compartilhadas em conversas; revogue-as e gere novas.

Configure os secrets e publique as funções com a Supabase CLI:

```powershell
supabase secrets set --env-file supabase/functions/.env.local
supabase functions deploy empresa-signup
supabase functions deploy asaas
supabase functions deploy asaas-webhook
supabase functions deploy pdv-asaas
```

Antes de publicar `pdv-asaas` e `asaas-webhook`, aplique `supabase/migrations/20261020180000_add_asaas_activation_checkout.sql` no banco Supabase. A migração cria o armazenamento cifrado e os estados idempotentes da ativação. Não publique o novo fluxo antes de aplicar a migração.

A função de webhook deve estar acessível em `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`, com o mesmo token configurado em `ASAAS_WEBHOOK_TOKEN`. Na conta master, habilite `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `CHECKOUT_PAID` e `SUBSCRIPTION_CREATED`: os dois últimos sincronizam checkouts; os eventos de pagamento confirmam Pix e a taxa de ativação. A conexão de cada subconta do PDV registra automaticamente o webhook para as vendas daquela loja (`PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`). A conta principal precisa ser uma pessoa jurídica habilitada pelo Asaas para criar subcontas. A ativação do gateway cobra uma taxa única de R$ 49,99 na conta master; Pix apresenta QR e código copia-e-cola, e cartão usa checkout hospedado oficial do Asaas. A subconta só é criada após confirmação do pagamento no webhook. O titular recebe as instruções do Asaas e cadastra/valida seu destino de saque diretamente na plataforma Asaas: o endpoint oficial de criação de subcontas não aceita dados de conta bancária ou chave Pix de saque, e a API não permite recuperar posteriormente a chave de uma subconta já criada. Subcontas preexistentes sem credenciais locais não são duplicadas; precisam de validação pelo suporte. Taxas de criação/uso de subconta dependem do contrato Asaas. O split de R$ 0,10 é enviado em cada cobrança Pix de venda para `SPLIT_WALLET_ID`; a assinatura do PDV permanece separada e é cobrada diretamente na conta master. A venda fica pendente até o webhook confirmar o pagamento e o estado operacional do caixa não é alterado para “PAGO”.

Os painéis administrativos validam as chaves de API com uma consulta somente de leitura à conta Asaas. Essa verificação confirma autenticação, mas não confirma a entrega dos webhooks nem substitui um teste de cobrança em homologação antes de operar em produção.

O QR Pix próprio é uma opção independente: o operador exibe o QR/chave configurado e confirma manualmente o recebimento. Cobranças manuais não usam o gateway nem o split. A tela administrativa informa quando a conexão da loja com o Asaas não está configurada.

PIX cria a assinatura e apresenta o link inicial de cobrança quando o Asaas o disponibiliza. Cartão abre uma página de checkout recorrente hospedada pelo Asaas; os dados do cartão não passam pelo PDV. A taxa de ativação do gateway também usa Pix pela API Asaas ou cartão em checkout hospedado; o navegador do PDV nunca coleta número de cartão ou CVV.

Os blocos recorrentes de produtos são R$ 9,90/mês por bloco de 100 produtos e R$ 24,90/mês por bloco de 1.000, com até 1.000 unidades de cada tipo por assinatura. O Asaas cobra os blocos no mesmo checkout/assinatura mensal do plano escolhido; no plano Grátis, a recorrência cobra apenas os blocos. O checkout oficial coleta os dados do pagador. A alteração dos blocos atualiza o valor das próximas cobranças da assinatura ativa; para assinaturas de cartão, a conta Asaas pode exigir tokenização habilitada para permitir alteração de valor.

O PDV não possui integração ou fluxo de emissão de NFC-e/NF-e. Os comprovantes são documentos não fiscais e não substituem documento fiscal obrigatório, cuja emissão permanece sob responsabilidade do estabelecimento por sistema e provedor regularizados. Os termos em `www/termos.html` são uma minuta e precisam de revisão jurídica.