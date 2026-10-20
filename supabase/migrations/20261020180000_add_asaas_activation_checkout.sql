CREATE TABLE IF NOT EXISTS public.asaas_account_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'PENDING_PAYMENT'
        CHECK (status IN ('PENDING_PAYMENT', 'CREATING_ACCOUNT', 'ACTIVE', 'FAILED', 'REVIEW_REQUIRED')),
    billing_type text NOT NULL CHECK (billing_type IN ('PIX', 'CREDIT_CARD')),
    asaas_payment_id text,
    asaas_checkout_id text,
    payment_url text,
    account_data_ciphertext text NOT NULL,
    account_data_iv text NOT NULL,
    terms_accepted_at timestamptz NOT NULL,
    terms_accepted_ip varchar(45),
    failure_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS asaas_account_activations_payment_id_unique
    ON public.asaas_account_activations (asaas_payment_id)
    WHERE asaas_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS asaas_account_activations_checkout_id_unique
    ON public.asaas_account_activations (asaas_checkout_id)
    WHERE asaas_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS asaas_account_activations_open_company_unique
    ON public.asaas_account_activations (empresa_id)
    WHERE status IN ('PENDING_PAYMENT', 'CREATING_ACCOUNT');

ALTER TABLE public.asaas_account_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asaas_account_activations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.asaas_account_activations TO service_role;

CREATE OR REPLACE FUNCTION public.pdv_claim_asaas_account_activation(
    p_activation_id uuid,
    p_payment_id text
)
RETURNS TABLE (
    claimed boolean,
    activation_status text,
    empresa_id uuid,
    account_data_ciphertext text,
    account_data_iv text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_activation public.asaas_account_activations%ROWTYPE;
BEGIN
    SELECT * INTO v_activation
    FROM public.asaas_account_activations
    WHERE id = p_activation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_activation.status = 'PENDING_PAYMENT'
       AND (v_activation.asaas_payment_id IS NULL OR v_activation.asaas_payment_id = p_payment_id) THEN
        UPDATE public.asaas_account_activations
        SET status = 'CREATING_ACCOUNT',
            asaas_payment_id = coalesce(asaas_account_activations.asaas_payment_id, p_payment_id),
            updated_at = now()
        WHERE id = p_activation_id
        RETURNING * INTO v_activation;

        RETURN QUERY SELECT true, v_activation.status, v_activation.empresa_id,
            v_activation.account_data_ciphertext, v_activation.account_data_iv;
        RETURN;
    END IF;

    IF v_activation.status = 'CREATING_ACCOUNT'
       AND v_activation.updated_at < now() - interval '10 minutes' THEN
        UPDATE public.asaas_account_activations
        SET updated_at = now()
        WHERE id = p_activation_id
        RETURNING * INTO v_activation;

        RETURN QUERY SELECT true, v_activation.status, v_activation.empresa_id,
            v_activation.account_data_ciphertext, v_activation.account_data_iv;
        RETURN;
    END IF;

    RETURN QUERY SELECT false, v_activation.status, v_activation.empresa_id,
        v_activation.account_data_ciphertext, v_activation.account_data_iv;
END;
$$;

REVOKE ALL ON FUNCTION public.pdv_claim_asaas_account_activation(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_claim_asaas_account_activation(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
