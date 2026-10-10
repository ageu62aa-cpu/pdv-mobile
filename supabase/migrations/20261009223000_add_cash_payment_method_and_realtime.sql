ALTER TABLE public.vendas
    ADD COLUMN IF NOT EXISTS forma_pagamento text;

DO $$
DECLARE
    tabela text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tabela IN ARRAY ARRAY['caixas', 'vendas', 'produtos']
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = tabela
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
            END IF;
        END LOOP;
    END IF;
END
$$;
