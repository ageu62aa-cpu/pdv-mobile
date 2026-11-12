ALTER TABLE public.assinaturas
    ADD COLUMN IF NOT EXISTS blocos_100_produtos integer NOT NULL DEFAULT 0
        CHECK (blocos_100_produtos >= 0),
    ADD COLUMN IF NOT EXISTS blocos_1000_produtos integer NOT NULL DEFAULT 0
        CHECK (blocos_1000_produtos >= 0);

DROP FUNCTION IF EXISTS public.vancely_get_tenant_entitlements(uuid);

CREATE FUNCTION public.vancely_get_tenant_entitlements(p_empresa_id uuid)
RETURNS TABLE (
    plano_id text,
    nome text,
    preco_mensal numeric,
    limite_operadores integer,
    limite_dispositivos integer,
    limite_produtos integer,
    dias_historico integer,
    limite_notas_mensais integer,
    status_assinatura text,
    blocos_100_produtos integer,
    blocos_1000_produtos integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
    SELECT p.id,
           p.nome,
           p.preco_mensal,
           p.limite_operadores,
           p.limite_dispositivos,
           p.limite_produtos
               + coalesce(a.blocos_100_produtos, 0) * 100
               + coalesce(a.blocos_1000_produtos, 0) * 1000,
           p.dias_historico,
           p.limite_notas_mensais,
           e.status_assinatura,
           coalesce(a.blocos_100_produtos, 0),
           coalesce(a.blocos_1000_produtos, 0)
    FROM public.empresas e
    LEFT JOIN LATERAL (
        SELECT assinatura.plano_id,
               assinatura.blocos_100_produtos,
               assinatura.blocos_1000_produtos
        FROM public.assinaturas assinatura
        WHERE assinatura.empresa_id = e.id
          AND assinatura.status IN ('ACTIVE', 'TRIALING')
        ORDER BY assinatura.updated_at DESC
        LIMIT 1
    ) a ON true
    JOIN public.planos p ON p.id = coalesce(a.plano_id, e.plano_id)
    WHERE e.id = p_empresa_id
      AND (
          e.id = auth.uid()
          OR lower(coalesce(e.email_admin, ''))
              = lower(coalesce(auth.jwt() ->> 'email', ''))
          OR lower(coalesce(e.email, ''))
              = lower(coalesce(auth.jwt() ->> 'email', ''))
          OR EXISTS (
              SELECT 1
              FROM public.usuarios_empresas ue
              WHERE ue.empresa_id = e.id
                AND ue.user_id = auth.uid()
          )
      );
$$;

REVOKE ALL ON FUNCTION public.vancely_get_tenant_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vancely_get_tenant_entitlements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pdv_enforce_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
    v_limite integer;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.empresa_id::text, 1));

    SELECT p.limite_produtos INTO v_limite
    FROM public.empresas e
    JOIN public.planos p ON p.id = e.plano_id
    WHERE e.id = NEW.empresa_id;

    SELECT p.limite_produtos
               + coalesce(a.blocos_100_produtos, 0) * 100
               + coalesce(a.blocos_1000_produtos, 0) * 1000
    INTO v_limite
    FROM public.assinaturas a
    JOIN public.planos p ON p.id = a.plano_id
    WHERE a.empresa_id = NEW.empresa_id
      AND a.status IN ('ACTIVE', 'TRIALING')
    ORDER BY a.updated_at DESC
    LIMIT 1;

    IF v_limite IS NULL THEN
        SELECT p.limite_produtos INTO v_limite
        FROM public.empresas e
        JOIN public.planos p ON p.id = e.plano_id
        WHERE e.id = NEW.empresa_id;
    END IF;

    IF (
        SELECT count(*)
        FROM public.produtos
        WHERE empresa_id = NEW.empresa_id
    ) >= v_limite THEN
        RAISE EXCEPTION 'Limite de % produtos do plano atingido. Faça upgrade ou adicione blocos de produtos.',
            v_limite;
    END IF;
    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
