UPDATE public.empresas e
SET plano_id = 'gratis',
    plano = 'gratis',
    plano_atual = 'GRATUITO',
    plano_status = 'ATIVO',
    status_assinatura = 'ATIVO'
WHERE NOT EXISTS (
    SELECT 1
    FROM public.assinaturas a
    WHERE a.empresa_id = e.id
      AND a.status IN ('ACTIVE', 'TRIALING')
      AND a.plano_id <> 'gratis'
);

NOTIFY pgrst, 'reload schema';
