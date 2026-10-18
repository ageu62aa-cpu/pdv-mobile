CREATE OR REPLACE FUNCTION public.vancely_can_register_sale(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT public.vancely_is_company_admin(p_empresa_id)
        OR EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.empresa_id = p_empresa_id
              AND ue.user_id = auth.uid()
              AND ue.cargo = 'operador'
        );
$$;

REVOKE ALL ON FUNCTION public.vancely_can_register_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vancely_can_register_sale(uuid) TO authenticated;

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendas_insert_company_member ON public.vendas;
CREATE POLICY vendas_insert_company_member
    ON public.vendas
    FOR INSERT
    TO authenticated
    WITH CHECK (public.vancely_can_register_sale(empresa_id));

DROP POLICY IF EXISTS vendas_insert_company_member_guard ON public.vendas;
CREATE POLICY vendas_insert_company_member_guard
    ON public.vendas
    AS RESTRICTIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (public.vancely_can_register_sale(empresa_id));

GRANT INSERT ON public.vendas TO authenticated;

ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_empresas_select_own ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_select_own
    ON public.usuarios_empresas
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS usuarios_empresas_admin_insert_operator ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_admin_insert_operator
    ON public.usuarios_empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (
        cargo = 'operador'
        AND public.vancely_is_company_admin(empresa_id)
    );

DROP POLICY IF EXISTS usuarios_empresas_admin_insert_operator_guard ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_admin_insert_operator_guard
    ON public.usuarios_empresas
    AS RESTRICTIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (
        cargo = 'operador'
        AND public.vancely_is_company_admin(empresa_id)
    );

DROP POLICY IF EXISTS usuarios_empresas_admin_delete_operator ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_admin_delete_operator
    ON public.usuarios_empresas
    FOR DELETE
    TO authenticated
    USING (
        cargo = 'operador'
        AND public.vancely_is_company_admin(empresa_id)
    );

DROP POLICY IF EXISTS usuarios_empresas_admin_delete_operator_guard ON public.usuarios_empresas;
CREATE POLICY usuarios_empresas_admin_delete_operator_guard
    ON public.usuarios_empresas
    AS RESTRICTIVE
    FOR DELETE
    TO authenticated
    USING (
        cargo = 'operador'
        AND public.vancely_is_company_admin(empresa_id)
    );

GRANT SELECT, INSERT, DELETE ON public.usuarios_empresas TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'sessoes_ativas'
       ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sessoes_ativas';
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
