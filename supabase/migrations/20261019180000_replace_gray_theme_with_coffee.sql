ALTER TABLE public.empresas
    DROP CONSTRAINT IF EXISTS empresas_theme_color_check;

UPDATE public.empresas
SET theme_color = 'coffee'
WHERE theme_color = 'gray';

ALTER TABLE public.empresas
    ADD CONSTRAINT empresas_theme_color_check
    CHECK (theme_color IN ('green', 'yellow', 'pink', 'orange', 'purple', 'coffee'));

CREATE OR REPLACE FUNCTION public.vancely_update_theme_color(
    p_empresa_id uuid,
    p_theme_color text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
    IF p_theme_color = 'gray' THEN
        p_theme_color := 'coffee';
    END IF;

    IF p_theme_color IS NULL OR p_theme_color NOT IN ('green', 'yellow', 'pink', 'orange', 'purple', 'coffee') THEN
        RAISE EXCEPTION 'Cor de marca inválida.';
    END IF;

    IF NOT (
        public.vancely_is_company_admin(p_empresa_id)
        OR EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.empresa_id = p_empresa_id
              AND ue.user_id = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Você não tem acesso a esta empresa.';
    END IF;

    UPDATE public.empresas
    SET theme_color = p_theme_color
    WHERE id = p_empresa_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Empresa não encontrada.';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.vancely_update_theme_color(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vancely_update_theme_color(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
