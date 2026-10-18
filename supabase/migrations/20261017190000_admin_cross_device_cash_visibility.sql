CREATE OR REPLACE FUNCTION public.vancely_is_company_admin(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.empresas e
        WHERE e.id = p_empresa_id
          AND (
              e.id = auth.uid()
              OR (
                  auth.jwt() ->> 'email' IS NOT NULL
                  AND lower(coalesce(e.email_admin, '')) = lower(auth.jwt() ->> 'email')
              )
              OR (
                  auth.jwt() ->> 'email' IS NOT NULL
                  AND lower(coalesce(e.email, '')) = lower(auth.jwt() ->> 'email')
              )
          )
    )
    OR EXISTS (
        SELECT 1
        FROM public.usuarios_empresas ue
        WHERE ue.empresa_id = p_empresa_id
          AND ue.user_id = auth.uid()
          AND ue.cargo = 'admin_mercado'
    );
$$;

REVOKE ALL ON FUNCTION public.vancely_is_company_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vancely_is_company_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS empresas_admin_read_company
    ON public.empresas;
CREATE POLICY empresas_admin_read_company
    ON public.empresas
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(id));

DROP POLICY IF EXISTS usuarios_empresas_admin_read_company
    ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_admin_read_company
    ON public.usuarios_empresas
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(empresa_id));

DROP POLICY IF EXISTS operadores_admin_read_company
    ON public.operadores;
CREATE POLICY operadores_admin_read_company
    ON public.operadores
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(empresa_id));

DROP POLICY IF EXISTS caixas_admin_read_company
    ON public.caixas;
CREATE POLICY caixas_admin_read_company
    ON public.caixas
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(empresa_id));

DROP POLICY IF EXISTS vendas_admin_read_company
    ON public.vendas;
CREATE POLICY vendas_admin_read_company
    ON public.vendas
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(empresa_id));

DROP POLICY IF EXISTS cancelamentos_caixa_admin_read_company
    ON public.cancelamentos_caixa;
CREATE POLICY cancelamentos_caixa_admin_read_company
    ON public.cancelamentos_caixa
    FOR SELECT
    TO authenticated
    USING (public.vancely_is_company_admin(empresa_id));

DO $$
DECLARE
    tabela text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tabela IN ARRAY ARRAY['caixas', 'vendas', 'cancelamentos_caixa', 'operadores', 'usuarios_empresas']
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = tabela
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
            END IF;
        END LOOP;
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
