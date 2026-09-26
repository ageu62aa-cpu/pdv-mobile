// ==========================================
// MÓDULO DE AUTENTICAÇÃO E CADASTRO (PDV-VS)
// ==========================================

import { empresaAtualId, setEmpresaAtualId } from '../../core/state.js';

// --- UTILITÁRIO INTERNO: RESOLUÇÃO DE EMPRESA ---
async function resolverEmpresaIdAtual() {
    let idEmpresa = empresaAtualId || localStorage.getItem('empresa_id') || localStorage.getItem('pdv_empresa_id');
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: vincData } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (vincData && vincData.empresa_id) {
                idEmpresa = vincData.empresa_id;
            } else if (!idEmpresa) {
                idEmpresa = session.user.id;
            }
            setEmpresaAtualId(idEmpresa);
            localStorage.setItem('empresa_id', idEmpresa);
            localStorage.setItem('id_empresa', idEmpresa);
        }
    } catch (e) {
        console.error("PDV-VS: Erro ao validar empresa na sessão:", e);
    }
    return idEmpresa;
}

export async function processarAutenticacao() {
    const emailInput = document.getElementById('inputLoginEmail') || document.getElementById('emailLogin') || document.querySelector('input[type="email"]');
    const senhaInput = document.getElementById('inputLoginSenha') || document.getElementById('senhaLogin') || document.querySelector('input[type="password"]');

    const email = emailInput?.value.trim() || '';
    const password = senhaInput?.value.trim() || '';

    if (!email || !password) {
        alert('PDV-VS: Por favor, informe o e-mail e a senha.');
        return;
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            alert('PDV-VS: Erro ao realizar login: ' + error.message);
            return;
        }

        if (data && data.session) {
            const userId = data.session.user.id;
            const idEmpresa = await resolverEmpresaIdAtual();

            const { data: vincData } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('cargo, empresa_id')
                .eq('user_id', userId)
                .maybeSingle();

            const rawCargo = vincData?.cargo || 'operador';
            const cargo = (rawCargo === 'admin_mercado' || rawCargo === 'admin') ? 'admin' : 'operador';

            localStorage.setItem('empresa_id', idEmpresa);
            localStorage.setItem('id_empresa', idEmpresa);
            localStorage.setItem('pdv_cargo_usuario', cargo);
            sessionStorage.setItem('pdv_cargo_usuario', cargo);
            sessionStorage.setItem('id_empresa', idEmpresa);

            const btnAdmin = document.getElementById('btnAbrirAdmin') || document.getElementById('btnAdmin');
            const modalAdmin = document.getElementById('modalAdmin');

            if (cargo === 'operador') {
                sessionStorage.setItem('restricao_admin', 'true');
                if (btnAdmin) {
                    btnAdmin.style.display = 'none';
                    btnAdmin.setAttribute('disabled', 'true');
                }
                if (modalAdmin) modalAdmin.classList.add('hidden');
            } else {
                sessionStorage.setItem('restricao_admin', 'false');
                if (btnAdmin) {
                    btnAdmin.style.display = '';
                    btnAdmin.removeAttribute('disabled');
                }
            }

            location.reload();
        }
    } catch (e) {
        alert('PDV-VS: Erro de autenticação: ' + e.message);
    }
}

export function tratarEnterLogin(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        processarAutenticacao();
    }
}

export async function cadastrarEstabelecimento() {
    const nomeInput = document.getElementById('inputCadNomeEmpresa') || document.getElementById('nomeEmpresa');
    const emailInput = document.getElementById('inputCadEmail') || document.getElementById('emailCadastro');
    const senhaInput = document.getElementById('inputCadSenha') || document.getElementById('senhaCadastro');
    const whatsappInput = document.getElementById('inputCadWhatsapp') || document.getElementById('whatsappCadastro');

    const nome_mercado = nomeInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const password = senhaInput?.value.trim() || '';
    const whatsapp = whatsappInput?.value.trim() || '';

    if (!nome_mercado || !email || !password) {
        alert('PDV-VS: Preencha todos os campos obrigatórios (Nome, E-mail e Senha).');
        return;
    }

    try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({ email, password });

        if (authError) {
            alert('PDV-VS: Erro ao cadastrar usuário: ' + authError.message);
            return;
        }

        if (authData && authData.user) {
            const userId = authData.user.id;

            const { data: empresaData, error: empresaError } = await window.supabaseClient
                .from('empresas')
                .insert([{ id: userId, nome_mercado, whatsapp }])
                .select()
                .single();

            if (empresaError) {
                alert('PDV-VS: Erro ao cadastrar empresa no banco de dados: ' + empresaError.message);
                return;
            }

            const empresaId = empresaData?.id || userId;

            const { error: vincError } = await window.supabaseClient
                .from('usuarios_empresas')
                .insert([{ user_id: userId, empresa_id: empresaId, cargo: 'admin_mercado' }]);

            if (vincError) {
                alert('PDV-VS: Erro ao vincular administrador: ' + vincError.message);
                return;
            }

            localStorage.setItem('empresa_id', empresaId);
            localStorage.setItem('id_empresa', empresaId);
            localStorage.setItem('pdv_empresa_nome', nome_mercado);

            alert('PDV-VS: Estabelecimento cadastrado com sucesso! Redirecionando...');

            const modalCadastro = document.getElementById('modalCadastro') || document.getElementById('telaCadastro');
            const modalLogin = document.getElementById('modalLogin') || document.getElementById('telaLogin');

            if (modalCadastro && modalLogin) {
                modalCadastro.classList.add('hidden');
                modalLogin.classList.remove('hidden');
            } else {
                location.reload();
            }
        }
    } catch (e) {
        alert('PDV-VS: Erro ao processar o cadastro do estabelecimento: ' + e.message);
    }
}

// Registro global para compatibilidade com eventos HTML onclick
Object.assign(window, {
    processarAutenticacao,
    tratarEnterLogin,
    cadastrarEstabelecimento
});