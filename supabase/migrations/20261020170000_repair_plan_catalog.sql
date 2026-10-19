CREATE TABLE IF NOT EXISTS public.planos (
    id text PRIMARY KEY,
    nome text NOT NULL,
    preco numeric(10, 2) NOT NULL DEFAULT 0,
    preco_mensal numeric(10, 2) NOT NULL DEFAULT 0,
    operadores_extra integer NOT NULL DEFAULT 0,
    limite_operadores integer NOT NULL DEFAULT 0,
    produtos_limite integer NOT NULL DEFAULT 100,
    limite_produtos integer NOT NULL DEFAULT 100,
    historico_dias integer,
    dias_historico integer,
    notas_fiscais_mes integer,
    limite_notas_mensais integer,
    dispositivos_limite integer NOT NULL DEFAULT 1,
    limite_dispositivos integer NOT NULL DEFAULT 1,
    ativo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.planos
    ADD COLUMN IF NOT EXISTS id text,
    ADD COLUMN IF NOT EXISTS nome text,
    ADD COLUMN IF NOT EXISTS preco numeric(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS preco_mensal numeric(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS operadores_extra integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS limite_operadores integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS produtos_limite integer NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS limite_produtos integer NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS historico_dias integer,
    ADD COLUMN IF NOT EXISTS dias_historico integer,
    ADD COLUMN IF NOT EXISTS notas_fiscais_mes integer,
    ADD COLUMN IF NOT EXISTS limite_notas_mensais integer,
    ADD COLUMN IF NOT EXISTS dispositivos_limite integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS limite_dispositivos integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

UPDATE public.planos
SET id = coalesce(nullif(trim(id), ''), 'legado-' || gen_random_uuid()::text),
    nome = coalesce(
        nullif(trim(nome), ''),
        'Plano legado ' || coalesce(nullif(trim(id), ''), gen_random_uuid()::text)
    ),
    preco_mensal = coalesce(nullif(preco_mensal, 0), preco, 0),
    preco = coalesce(preco, preco_mensal, 0),
    operadores_extra = coalesce(operadores_extra, limite_operadores, 0),
    limite_operadores = coalesce(limite_operadores, operadores_extra, 0),
    produtos_limite = coalesce(nullif(produtos_limite, 0), limite_produtos, 100),
    limite_produtos = coalesce(nullif(limite_produtos, 0), produtos_limite, 100),
    dispositivos_limite = coalesce(dispositivos_limite, limite_dispositivos, 1),
    limite_dispositivos = coalesce(limite_dispositivos, dispositivos_limite, 1),
    ativo = coalesce(ativo, true);

ALTER TABLE public.planos
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN preco SET NOT NULL,
    ALTER COLUMN preco_mensal SET NOT NULL,
    ALTER COLUMN operadores_extra SET NOT NULL,
    ALTER COLUMN limite_operadores SET NOT NULL,
    ALTER COLUMN produtos_limite SET NOT NULL,
    ALTER COLUMN limite_produtos SET NOT NULL,
    ALTER COLUMN dispositivos_limite SET NOT NULL,
    ALTER COLUMN limite_dispositivos SET NOT NULL,
    ALTER COLUMN ativo SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT id
        FROM public.planos
        GROUP BY id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'A tabela public.planos contém IDs duplicados. Corrija-os antes de aplicar esta migration.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS planos_id_unique ON public.planos (id);

INSERT INTO public.planos (
    id,
    nome,
    preco,
    preco_mensal,
    operadores_extra,
    limite_operadores,
    produtos_limite,
    limite_produtos,
    historico_dias,
    dias_historico,
    notas_fiscais_mes,
    limite_notas_mensais,
    dispositivos_limite,
    limite_dispositivos,
    ativo
) VALUES
    ('gratis', 'Grátis', 0, 0, 0, 0, 100, 100, 7, 7, 0, 0, 1, 1, true),
    ('iniciante', 'Iniciante', 29.99, 29.99, 1, 1, 1000, 1000, 30, 30, 50, 50, 2, 2, true),
    ('profissional', 'Profissional', 49.99, 49.99, 3, 3, 3000, 3000, 90, 90, 200, 200, 4, 4, true),
    ('ouro', 'Ouro', 59.99, 59.99, 5, 5, 5000, 5000, 365, 365, 500, 500, 6, 6, true),
    ('diamante', 'Diamante', 99.99, 99.99, 10, 10, 10000, 10000, NULL, NULL, NULL, NULL, 12, 12, true)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    preco = EXCLUDED.preco,
    preco_mensal = EXCLUDED.preco_mensal,
    operadores_extra = EXCLUDED.operadores_extra,
    limite_operadores = EXCLUDED.limite_operadores,
    produtos_limite = EXCLUDED.produtos_limite,
    limite_produtos = EXCLUDED.limite_produtos,
    historico_dias = EXCLUDED.historico_dias,
    dias_historico = EXCLUDED.dias_historico,
    notas_fiscais_mes = EXCLUDED.notas_fiscais_mes,
    limite_notas_mensais = EXCLUDED.limite_notas_mensais,
    dispositivos_limite = EXCLUDED.dispositivos_limite,
    limite_dispositivos = EXCLUDED.limite_dispositivos,
    ativo = EXCLUDED.ativo;

UPDATE public.assinaturas
SET plano_id = CASE plano_id
    WHEN 'bronze' THEN 'iniciante'
    WHEN 'prata' THEN 'profissional'
    ELSE plano_id
END
WHERE plano_id IN ('bronze', 'prata');

UPDATE public.empresas
SET plano_id = CASE plano_id
        WHEN 'bronze' THEN 'iniciante'
        WHEN 'prata' THEN 'profissional'
        ELSE plano_id
    END,
    plano = CASE lower(coalesce(plano, ''))
        WHEN 'bronze' THEN 'iniciante'
        WHEN 'comum' THEN 'iniciante'
        WHEN 'comum_enterprise' THEN 'iniciante'
        WHEN 'prata' THEN 'profissional'
        WHEN 'silver' THEN 'profissional'
        ELSE plano
    END,
    plano_atual = CASE lower(coalesce(plano_id, ''))
        WHEN 'bronze' THEN 'INICIANTE'
        WHEN 'prata' THEN 'PROFISSIONAL'
        ELSE plano_atual
    END
WHERE plano_id IN ('bronze', 'prata')
   OR lower(coalesce(plano, '')) IN ('bronze', 'comum', 'comum_enterprise', 'prata', 'silver');

UPDATE public.planos
SET ativo = false
WHERE id IN ('bronze', 'prata');

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planos_public_read ON public.planos;
CREATE POLICY planos_public_read
    ON public.planos
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.planos TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
