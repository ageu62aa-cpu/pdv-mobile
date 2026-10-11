ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS nome_empresa text,
    ADD COLUMN IF NOT EXISTS cnpj text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS email_admin text,
    ADD COLUMN IF NOT EXISTS whatsapp text,
    ADD COLUMN IF NOT EXISTS cep text,
    ADD COLUMN IF NOT EXISTS endereco text,
    ADD COLUMN IF NOT EXISTS numero text,
    ADD COLUMN IF NOT EXISTS cidade text,
    ADD COLUMN IF NOT EXISTS estado text,
    ADD COLUMN IF NOT EXISTS responsavel text,
    ADD COLUMN IF NOT EXISTS nome_responsavel text,
    ADD COLUMN IF NOT EXISTS plano text DEFAULT 'comum_enterprise',
    ADD COLUMN IF NOT EXISTS limite_produtos integer DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS limite_operadores integer DEFAULT 1,
    ADD COLUMN IF NOT EXISTS dias_restantes integer DEFAULT 30;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'empresas'
          AND column_name = 'cnpj_cpf'
    ) THEN
        EXECUTE '
            UPDATE public.empresas
            SET cnpj = COALESCE(NULLIF(cnpj, ''''), cnpj_cpf)
            WHERE cnpj IS NULL OR cnpj = ''''
        ';
    END IF;
END
$$;

UPDATE public.empresas
SET email_admin = email
WHERE (email_admin IS NULL OR btrim(email_admin) = '')
  AND email IS NOT NULL;

NOTIFY pgrst, 'reload schema';
