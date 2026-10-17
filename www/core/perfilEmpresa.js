function normalizarEmail(email) {
    return String(email || '').trim().toLocaleLowerCase();
}

export async function obterPerfilEmpresa(supabaseClient, user) {
    const { data: vinculo, error: erroVinculo } = await supabaseClient
        .from('usuarios_empresas')
        .select('empresa_id, cargo')
        .eq('user_id', user.id)
        .maybeSingle();
    if (erroVinculo) throw erroVinculo;

    const { data: empresaPropria, error: erroEmpresaPropria } = await supabaseClient
        .from('empresas')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    if (erroEmpresaPropria) throw erroEmpresaPropria;
    if (empresaPropria) {
        return { empresa: empresaPropria, empresaId: empresaPropria.id, cargo: 'admin_mercado' };
    }

    if (vinculo?.empresa_id) {
        const { data: empresaVinculada, error: erroEmpresaVinculada } = await supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', vinculo.empresa_id)
            .maybeSingle();
        if (erroEmpresaVinculada) throw erroEmpresaVinculada;

        const emailAtual = normalizarEmail(user.email);
        const emailsDaEmpresa = [
            normalizarEmail(empresaVinculada?.email_admin),
            normalizarEmail(empresaVinculada?.email)
        ];
        if (empresaVinculada && emailAtual && emailsDaEmpresa.includes(emailAtual)) {
            return { empresa: empresaVinculada, empresaId: empresaVinculada.id, cargo: 'admin_mercado' };
        }

        if (empresaVinculada && vinculo.cargo === 'admin_mercado') {
            return { empresa: empresaVinculada, empresaId: empresaVinculada.id, cargo: 'admin_mercado' };
        }
        if (empresaVinculada && vinculo.cargo === 'operador') {
            return { empresa: empresaVinculada, empresaId: empresaVinculada.id, cargo: 'operador' };
        }
    }

    if (user.email) {
        for (const coluna of ['email_admin', 'email']) {
            const { data: empresas, error } = await supabaseClient
                .from('empresas')
                .select('*')
                .ilike(coluna, user.email.trim())
                .limit(2);
            if (error) throw error;
            if (empresas?.length > 1) {
                throw new Error('O e-mail administrativo está vinculado a mais de uma empresa. Corrija os dados antes de entrar.');
            }
            if (empresas?.[0]) {
                return { empresa: empresas[0], empresaId: empresas[0].id, cargo: 'admin_mercado' };
            }
        }
    }

    throw new Error('Não foi possível confirmar um vínculo de administrador ou operador para este usuário.');
}
