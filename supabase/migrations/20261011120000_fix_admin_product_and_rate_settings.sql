ALTER TABLE public.produtos
    ADD COLUMN IF NOT EXISTS codigo_barras text,
    ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Geral';

UPDATE public.produtos
SET codigo_barras = codigo
WHERE codigo_barras IS NULL
  AND codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.empresas_config (
    empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    taxa_debito numeric(5, 2) NOT NULL DEFAULT 1.99 CHECK (taxa_debito BETWEEN 0 AND 100),
    taxa_credito_vista numeric(5, 2) NOT NULL DEFAULT 3.49 CHECK (taxa_credito_vista BETWEEN 0 AND 100),
    taxa_credito_parcelado numeric(5, 2) NOT NULL DEFAULT 4.99 CHECK (taxa_credito_parcelado BETWEEN 0 AND 100),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS empresas_config_select_admin ON public.empresas_config;
CREATE POLICY empresas_config_select_admin
    ON public.empresas_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = auth.uid()
              AND ue.empresa_id = empresas_config.empresa_id
              AND ue.cargo = 'admin_mercado'
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = empresas_config.empresa_id
              AND (e.id = auth.uid() OR e.email_admin = auth.jwt() ->> 'email')
        )
    );

DROP POLICY IF EXISTS empresas_config_insert_admin ON public.empresas_config;
CREATE POLICY empresas_config_insert_admin
    ON public.empresas_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = auth.uid()
              AND ue.empresa_id = empresas_config.empresa_id
              AND ue.cargo = 'admin_mercado'
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = empresas_config.empresa_id
              AND (e.id = auth.uid() OR e.email_admin = auth.jwt() ->> 'email')
        )
    );

DROP POLICY IF EXISTS empresas_config_update_admin ON public.empresas_config;
CREATE POLICY empresas_config_update_admin
    ON public.empresas_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = auth.uid()
              AND ue.empresa_id = empresas_config.empresa_id
              AND ue.cargo = 'admin_mercado'
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = empresas_config.empresa_id
              AND (e.id = auth.uid() OR e.email_admin = auth.jwt() ->> 'email')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = auth.uid()
              AND ue.empresa_id = empresas_config.empresa_id
              AND ue.cargo = 'admin_mercado'
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = empresas_config.empresa_id
              AND (e.id = auth.uid() OR e.email_admin = auth.jwt() ->> 'email')
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.empresas_config TO authenticated;

NOTIFY pgrst, 'reload schema';
