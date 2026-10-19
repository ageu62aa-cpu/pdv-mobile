ALTER TABLE public.assinaturas
    ADD COLUMN IF NOT EXISTS asaas_checkout_id text;

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_asaas_checkout_id_unique
    ON public.assinaturas (asaas_checkout_id)
    WHERE asaas_checkout_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.pdv_link_asaas_checkout_subscription(
    p_external_reference text,
    p_asaas_subscription_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_local_id uuid;
BEGIN
    IF p_external_reference IS NULL OR p_asaas_subscription_id IS NULL THEN
        RETURN false;
    END IF;

    BEGIN
        v_local_id := p_external_reference::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN false;
    END;

    UPDATE public.assinaturas
    SET asaas_subscription_id = p_asaas_subscription_id,
        updated_at = now()
    WHERE id = v_local_id
      AND asaas_checkout_id IS NOT NULL
      AND status IN ('PENDING', 'ACTIVE')
      AND (asaas_subscription_id IS NULL OR asaas_subscription_id = p_asaas_subscription_id);

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.pdv_activate_asaas_checkout(
    p_checkout_id text,
    p_external_reference text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_assinatura public.assinaturas%ROWTYPE;
BEGIN
    IF p_checkout_id IS NULL OR p_checkout_id = '' THEN
        RETURN false;
    END IF;

    SELECT * INTO v_assinatura
    FROM public.assinaturas
    WHERE asaas_checkout_id = p_checkout_id
      AND (p_external_reference IS NULL OR id::text = p_external_reference)
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    IF v_assinatura.status = 'ACTIVE' THEN
        RETURN true;
    END IF;
    IF v_assinatura.status <> 'PENDING' THEN
        RETURN false;
    END IF;

    UPDATE public.assinaturas
    SET status = 'ACTIVE',
        periodo_inicio = now(),
        updated_at = now()
    WHERE id = v_assinatura.id;

    UPDATE public.empresas
    SET plano_id = v_assinatura.plano_id,
        plano = v_assinatura.plano_id,
        plano_atual = CASE
            WHEN v_assinatura.plano_id = 'gratis' THEN 'GRATUITO'
            ELSE upper(v_assinatura.plano_id)
        END,
        plano_status = 'ATIVO',
        status_assinatura = 'ATIVO'
    WHERE id = v_assinatura.empresa_id;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.pdv_link_asaas_checkout_subscription(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pdv_activate_asaas_checkout(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_link_asaas_checkout_subscription(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pdv_activate_asaas_checkout(text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
