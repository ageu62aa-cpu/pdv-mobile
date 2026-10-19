UPDATE public.empresas e
SET asaas_subaccount_id = ga.asaas_account_id,
    asaas_wallet_id = ga.wallet_id,
    asaas_account_api_key = ga.api_key_ciphertext,
    asaas_account_api_key_iv = ga.api_key_iv,
    gateway_modo = 'ASAAS_REAL'
FROM public.asaas_gateway_accounts ga
WHERE ga.empresa_id = e.id
  AND e.asaas_subaccount_id IS NULL;

NOTIFY pgrst, 'reload schema';
