ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS cnpj text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS email_admin text;

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
