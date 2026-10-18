ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS termos_aceito boolean NOT NULL DEFAULT false;

UPDATE public.empresas
SET termos_aceito = true
WHERE termos_aceito IS DISTINCT FROM true;

COMMENT ON COLUMN public.empresas.termos_aceito IS
    'Compatibility flag for account access. Legacy tenants are grandfathered; new registrations must explicitly accept the current terms.';

NOTIFY pgrst, 'reload schema';
