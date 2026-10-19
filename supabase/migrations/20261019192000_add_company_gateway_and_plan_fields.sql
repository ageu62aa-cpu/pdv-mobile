ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS gateway_modo varchar(20) NOT NULL DEFAULT 'SIMULADO',
    ADD COLUMN IF NOT EXISTS asaas_subaccount_id varchar(100),
    ADD COLUMN IF NOT EXISTS asaas_wallet_id varchar(100),
    ADD COLUMN IF NOT EXISTS asaas_account_api_key text,
    ADD COLUMN IF NOT EXISTS asaas_account_api_key_iv text,
    ADD COLUMN IF NOT EXISTS termos_asaas_aceitos boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS termos_asaas_data_aceite timestamptz,
    ADD COLUMN IF NOT EXISTS termos_asaas_ip_aceite varchar(45),
    ADD COLUMN IF NOT EXISTS plano_atual varchar(50) NOT NULL DEFAULT 'GRATUITO',
    ADD COLUMN IF NOT EXISTS plano_status varchar(20) NOT NULL DEFAULT 'ATIVO',
    ADD COLUMN IF NOT EXISTS bairro text,
    ADD COLUMN IF NOT EXISTS tipo_empresa varchar(30),
    ADD COLUMN IF NOT EXISTS faturamento_mensal_estimado numeric(14, 2);

UPDATE public.empresas
SET plano_atual = 'GRATUITO',
    plano_status = 'ATIVO',
    gateway_modo = coalesce(gateway_modo, 'SIMULADO')
WHERE plano_atual IS NULL;

UPDATE public.empresas
SET bairro = coalesce(nullif(bairro, ''), cidade)
WHERE bairro IS NULL
  AND cidade IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'empresas_gateway_modo_check'
          AND conrelid = 'public.empresas'::regclass
    ) THEN
        ALTER TABLE public.empresas
            ADD CONSTRAINT empresas_gateway_modo_check
            CHECK (gateway_modo IN ('SIMULADO', 'ASAAS_REAL'));
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_empresas_asaas_subaccount_id
    ON public.empresas (asaas_subaccount_id);

NOTIFY pgrst, 'reload schema';
