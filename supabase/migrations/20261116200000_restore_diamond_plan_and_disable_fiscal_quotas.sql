UPDATE public.planos
SET nome = CASE id
        WHEN 'gratis' THEN 'GRATIS'
        WHEN 'iniciante' THEN 'BRONZE'
        WHEN 'profissional' THEN 'PRATA'
        WHEN 'ouro' THEN 'OURO'
        WHEN 'diamante' THEN 'DIAMANTE'
    END,
    preco_mensal = CASE id
        WHEN 'gratis' THEN 0
        WHEN 'iniciante' THEN 29.99
        WHEN 'profissional' THEN 49.99
        WHEN 'ouro' THEN 69.00
        WHEN 'diamante' THEN 99.99
    END,
    limite_operadores = CASE WHEN id = 'diamante' THEN 10 ELSE limite_operadores END,
    limite_dispositivos = CASE WHEN id = 'diamante' THEN 12 ELSE limite_dispositivos END,
    limite_produtos = CASE WHEN id = 'diamante' THEN 10000 ELSE limite_produtos END,
    dias_historico = CASE WHEN id = 'diamante' THEN NULL ELSE dias_historico END,
    limite_notas_mensais = 0,
    ativo = true
WHERE id IN ('gratis', 'iniciante', 'profissional', 'ouro', 'diamante');

NOTIFY pgrst, 'reload schema';
