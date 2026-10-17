CREATE TABLE IF NOT EXISTS public.sessoes_ativas (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    token_sessao text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sessoes_ativas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessoes_ativas_select_own ON public.sessoes_ativas;
CREATE POLICY sessoes_ativas_select_own
    ON public.sessoes_ativas
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS sessoes_ativas_insert_own ON public.sessoes_ativas;
CREATE POLICY sessoes_ativas_insert_own
    ON public.sessoes_ativas
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessoes_ativas_update_own ON public.sessoes_ativas;
CREATE POLICY sessoes_ativas_update_own
    ON public.sessoes_ativas
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.sessoes_ativas TO authenticated;
