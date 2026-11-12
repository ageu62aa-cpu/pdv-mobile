UPDATE public.planos
SET nome = 'Grátis',
    preco_mensal = 0,
    limite_operadores = 0,
    limite_produtos = 50,
    dias_historico = 7,
    ativo = true
WHERE id = 'gratis';

UPDATE public.planos
SET nome = 'Bronze',
    preco_mensal = 29.99,
    limite_operadores = 2,
    limite_produtos = 500,
    dias_historico = 30,
    ativo = true
WHERE id = 'iniciante';

UPDATE public.planos
SET nome = 'Prata',
    preco_mensal = 49.99,
    limite_operadores = 3,
    limite_produtos = 1000,
    dias_historico = 365,
    ativo = true
WHERE id = 'profissional';

UPDATE public.planos
SET nome = 'Ouro',
    preco_mensal = 69,
    limite_operadores = 5,
    limite_produtos = 5000,
    dias_historico = 1095,
    ativo = true
WHERE id = 'ouro';

UPDATE public.planos
SET ativo = false
WHERE id = 'diamante';
