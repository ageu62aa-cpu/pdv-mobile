CREATE OR REPLACE FUNCTION public.pdv_activate_subscription_from_asaas(
    p_asaas_subscription_id text,
    p_payment_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_assinatura public.assinaturas%ROWTYPE;
BEGIN
    SELECT * INTO v_assinatura
    FROM public.assinaturas
    WHERE asaas_subscription_id = p_asaas_subscription_id
    FOR UPDATE;
    IF NOT FOUND THEN RETURN false; END IF;

    UPDATE public.assinaturas
    SET status = 'ACTIVE',
        ultimo_pagamento_id = p_payment_id,
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

REVOKE ALL ON FUNCTION public.pdv_activate_subscription_from_asaas(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_activate_subscription_from_asaas(text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
