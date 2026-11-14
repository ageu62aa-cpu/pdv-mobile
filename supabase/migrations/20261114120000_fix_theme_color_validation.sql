ALTER TABLE public.empresas
    DROP CONSTRAINT IF EXISTS empresas_theme_color_check;

UPDATE public.empresas
SET theme_color = CASE lower(btrim(theme_color))
    WHEN 'verde' THEN 'green'
    WHEN 'green' THEN 'green'
    WHEN 'amarelo' THEN 'yellow'
    WHEN 'yellow' THEN 'yellow'
    WHEN 'rosa' THEN 'pink'
    WHEN 'pink' THEN 'pink'
    WHEN 'laranja' THEN 'orange'
    WHEN 'orange' THEN 'orange'
    WHEN 'roxo' THEN 'purple'
    WHEN 'purple' THEN 'purple'
    WHEN 'marrom-cafe' THEN 'coffee'
    WHEN 'marrom-café' THEN 'coffee'
    WHEN 'coffee' THEN 'coffee'
    WHEN 'gray' THEN 'coffee'
    ELSE theme_color
END
WHERE theme_color IS NOT NULL;

ALTER TABLE public.empresas
    ADD CONSTRAINT empresas_theme_color_check
    CHECK (theme_color IN ('green', 'yellow', 'pink', 'orange', 'purple', 'coffee'));

DROP FUNCTION IF EXISTS public.vancely_update_theme_color(uuid, text);

CREATE OR REPLACE FUNCTION public.vancely_update_theme_color(
    p_empresa_id uuid,
    p_theme_color text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_theme_color text;
    v_theme_input text := lower(btrim(coalesce(p_theme_color, '')));
BEGIN
    v_theme_color := CASE v_theme_input
        WHEN 'verde' THEN 'green'
        WHEN 'green' THEN 'green'
        WHEN 'amarelo' THEN 'yellow'
        WHEN 'yellow' THEN 'yellow'
        WHEN 'rosa' THEN 'pink'
        WHEN 'pink' THEN 'pink'
        WHEN 'laranja' THEN 'orange'
        WHEN 'orange' THEN 'orange'
        WHEN 'roxo' THEN 'purple'
        WHEN 'purple' THEN 'purple'
        WHEN 'marrom-cafe' THEN 'coffee'
        WHEN 'marrom-café' THEN 'coffee'
        WHEN 'coffee' THEN 'coffee'
        WHEN 'gray' THEN 'coffee'
        ELSE NULL
    END;

    IF v_theme_color IS NULL THEN
        RAISE EXCEPTION 'Cor de tema inválida.'
            USING ERRCODE = '22023';
    END IF;

    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.empresas e
        WHERE e.id = p_empresa_id
          AND (
              e.id = auth.uid()
              OR (
                  nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '') IS NOT NULL
                  AND lower(coalesce(e.email_admin, ''))
                      = lower(auth.jwt() ->> 'email')
              )
              OR (
                  nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '') IS NOT NULL
                  AND lower(coalesce(e.email, ''))
                      = lower(auth.jwt() ->> 'email')
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.usuarios_empresas ue
                  WHERE ue.empresa_id = e.id
                    AND ue.user_id = auth.uid()
              )
          )
    ) THEN
        RAISE EXCEPTION 'Usuário não autorizado a atualizar o tema desta empresa.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.empresas
    SET theme_color = v_theme_color
    WHERE id = p_empresa_id;
END;
$$;

REVOKE ALL ON FUNCTION public.vancely_update_theme_color(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vancely_update_theme_color(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
