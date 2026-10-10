CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.pdv_configuracoes (
    empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
    pin_cancelamento_hash text NOT NULL,
    atualizado_por uuid NOT NULL REFERENCES auth.users(id),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdv_configuracoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdv_configuracoes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.pdv_configurar_pin_cancelamento(
    p_empresa_id uuid,
    p_pin text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    usuario_id uuid := auth.uid();
    email_usuario text := auth.jwt() ->> 'email';
BEGIN
    IF usuario_id IS NULL THEN
        RAISE EXCEPTION 'Autenticação necessária para configurar o PIN.';
    END IF;
    IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
        RAISE EXCEPTION 'O PIN precisa ter pelo menos 4 caracteres.';
    END IF;
    IF NOT (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = usuario_id
              AND ue.empresa_id = p_empresa_id
              AND ue.cargo = 'admin_mercado'
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = p_empresa_id
              AND (e.id = usuario_id OR e.email_admin = email_usuario)
        )
    ) THEN
        RAISE EXCEPTION 'Somente o administrador da empresa pode configurar o PIN.';
    END IF;

    INSERT INTO public.pdv_configuracoes (
        empresa_id,
        pin_cancelamento_hash,
        atualizado_por,
        atualizado_em
    )
    VALUES (
        p_empresa_id,
        extensions.crypt(trim(p_pin), extensions.gen_salt('bf')),
        usuario_id,
        now()
    )
    ON CONFLICT (empresa_id) DO UPDATE
    SET pin_cancelamento_hash = EXCLUDED.pin_cancelamento_hash,
        atualizado_por = EXCLUDED.atualizado_por,
        atualizado_em = EXCLUDED.atualizado_em;
END;
$$;

CREATE OR REPLACE FUNCTION public.pdv_validar_pin_cancelamento(
    p_empresa_id uuid,
    p_pin text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    usuario_id uuid := auth.uid();
    hash_salvo text;
BEGIN
    IF usuario_id IS NULL OR p_pin IS NULL THEN
        RETURN false;
    END IF;
    IF NOT (
        EXISTS (
            SELECT 1
            FROM public.usuarios_empresas ue
            WHERE ue.user_id = usuario_id
              AND ue.empresa_id = p_empresa_id
              AND ue.cargo IN ('admin_mercado', 'operador')
        )
        OR EXISTS (
            SELECT 1
            FROM public.empresas e
            WHERE e.id = p_empresa_id
              AND e.id = usuario_id
        )
    ) THEN
        RAISE EXCEPTION 'Usuário sem vínculo com a empresa.';
    END IF;

    SELECT pc.pin_cancelamento_hash
    INTO hash_salvo
    FROM public.pdv_configuracoes pc
    WHERE pc.empresa_id = p_empresa_id;

    RETURN hash_salvo IS NOT NULL
       AND extensions.crypt(trim(p_pin), hash_salvo) = hash_salvo;
END;
$$;

REVOKE ALL ON FUNCTION public.pdv_configurar_pin_cancelamento(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pdv_validar_pin_cancelamento(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdv_configurar_pin_cancelamento(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pdv_validar_pin_cancelamento(uuid, text) TO authenticated;
