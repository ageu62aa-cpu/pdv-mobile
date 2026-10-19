ALTER TABLE public.empresas_config
    ADD COLUMN IF NOT EXISTS pix_payment_mode text NOT NULL DEFAULT 'manual'
        CHECK (pix_payment_mode IN ('manual', 'asaas')),
    ADD COLUMN IF NOT EXISTS pix_qr_code text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'empresas_config_pix_qr_code_format'
          AND conrelid = 'public.empresas_config'::regclass
    ) THEN
        ALTER TABLE public.empresas_config
            ADD CONSTRAINT empresas_config_pix_qr_code_format
            CHECK (
                pix_qr_code IS NULL
                OR (
                    length(pix_qr_code) <= 700000
                    AND pix_qr_code ~ '^data:image/(png|jpeg|webp);base64,'
                )
            );
    END IF;
END;
$$;

ALTER TABLE public.vendas
    ADD COLUMN IF NOT EXISTS status_pagamento text NOT NULL DEFAULT 'PAGO'
        CHECK (status_pagamento IN ('PENDENTE', 'PAGO', 'CANCELADO', 'FALHOU')),
    ADD COLUMN IF NOT EXISTS asaas_payment_id text,
    ADD COLUMN IF NOT EXISTS caixa_id uuid REFERENCES public.caixas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vendas_asaas_payment_id_unique
    ON public.vendas (asaas_payment_id)
    WHERE asaas_payment_id IS NOT NULL;

DROP POLICY IF EXISTS vendas_select_operator_own_cash ON public.vendas;
CREATE POLICY vendas_select_operator_own_cash
    ON public.vendas
    FOR SELECT
    TO authenticated
    USING (
        caixa_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.caixas c
            WHERE c.id = vendas.caixa_id
              AND c.user_id = auth.uid()
              AND c.empresa_id = vendas.empresa_id
        )
    );
GRANT SELECT ON public.vendas TO authenticated;

DROP POLICY IF EXISTS vendas_asaas_insert_pending_guard ON public.vendas;
CREATE POLICY vendas_asaas_insert_pending_guard
    ON public.vendas
    AS RESTRICTIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (
        lower(trim(coalesce(forma_pagamento, ''))) <> 'pix asaas'
        OR status_pagamento = 'PENDENTE'
    );

CREATE TABLE IF NOT EXISTS public.asaas_gateway_accounts (
    empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    asaas_account_id text NOT NULL,
    wallet_id text NOT NULL,
    api_key_ciphertext text NOT NULL,
    api_key_iv text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asaas_gateway_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asaas_gateway_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.asaas_gateway_accounts TO service_role;

CREATE OR REPLACE FUNCTION public.pdv_get_pix_settings(p_empresa_id uuid)
RETURNS TABLE (payment_mode text, qr_code text, gateway_connected boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT (
        EXISTS (
            SELECT 1 FROM public.usuarios_empresas ue
            WHERE ue.user_id = auth.uid() AND ue.empresa_id = p_empresa_id
        )
        OR EXISTS (
            SELECT 1 FROM public.empresas e
            WHERE e.id = p_empresa_id
              AND (
                  e.id = auth.uid()
                  OR lower(coalesce(e.email_admin, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
                  OR lower(coalesce(e.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
              )
        )
    ) THEN
        RAISE EXCEPTION 'Acesso não autorizado às configurações Pix.';
    END IF;

    RETURN QUERY
    SELECT
        CASE coalesce(e.gateway_modo, 'SIMULADO')
            WHEN 'ASAAS_REAL' THEN 'asaas'
            ELSE 'manual'
        END,
        ec.pix_qr_code,
        e.gateway_modo = 'ASAAS_REAL'
    FROM (SELECT 1) singleton
    JOIN public.empresas e ON e.id = p_empresa_id
    LEFT JOIN public.empresas_config ec ON ec.empresa_id = p_empresa_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pdv_get_pix_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pdv_get_pix_settings(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pdv_confirm_asaas_pix_sale(
    p_payment_id text,
    p_external_reference text,
    p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_venda public.vendas%ROWTYPE;
    v_item jsonb;
    v_quantidade numeric;
BEGIN
    IF p_payment_id IS NULL OR p_external_reference IS NULL OR p_amount IS NULL THEN
        RAISE EXCEPTION 'Dados de confirmação do pagamento incompletos.';
    END IF;

    SELECT * INTO v_venda
    FROM public.vendas
    WHERE id::text = p_external_reference
    FOR UPDATE;

    IF NOT FOUND
       OR v_venda.status_pagamento <> 'PENDENTE'
       OR (v_venda.asaas_payment_id IS NOT NULL AND v_venda.asaas_payment_id <> p_payment_id)
       OR abs(v_venda.valor_total - p_amount) > 0.01 THEN
        RETURN false;
    END IF;

    IF jsonb_typeof(v_venda.itens::jsonb) <> 'array' THEN
        RAISE EXCEPTION 'A venda pendente não contém itens válidos.';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_venda.itens::jsonb)
    LOOP
        v_quantidade := (v_item ->> 'qtd')::numeric;
        IF v_quantidade IS NULL OR v_quantidade <= 0 OR v_item ->> 'id' IS NULL THEN
            RAISE EXCEPTION 'Item inválido na venda pendente.';
        END IF;

        UPDATE public.produtos
        SET estoque = GREATEST(0, coalesce(estoque, 0) - v_quantidade)
        WHERE id::text = v_item ->> 'id'
          AND empresa_id = v_venda.empresa_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Um produto da venda pendente não foi encontrado.';
        END IF;
    END LOOP;

    UPDATE public.vendas
    SET status_pagamento = 'PAGO',
        asaas_payment_id = p_payment_id
    WHERE id = v_venda.id;

    IF v_venda.caixa_id IS NOT NULL THEN
        UPDATE public.caixas
        SET faturamento_dia = coalesce(faturamento_dia, 0) + v_venda.valor_total,
            updated_at = now()
        WHERE id = v_venda.caixa_id
          AND empresa_id = v_venda.empresa_id;
    END IF;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.pdv_confirm_asaas_pix_sale(text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_confirm_asaas_pix_sale(text, text, numeric) TO service_role;

NOTIFY pgrst, 'reload schema';
