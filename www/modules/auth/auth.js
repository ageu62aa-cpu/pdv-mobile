import { supabase } from '../../core/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const mascote = document.getElementById('mascote-container');
    const gatilhoSuperAdmin = document.getElementById('gatilho-super-admin');
    const btnAbrirCadastro = document.getElementById('btn-abrir-cadastro');
    const modalCadastro = document.getElementById('modal-cadastro');
    const btnFecharModal = document.getElementById('modal-close-btn');
    const formCadastro = document.getElementById('form-cadastro-empresa');
    const inputCep = document.getElementById('cad-cep');
    const btnEsqueceuSenha = document.getElementById('btn-esqueceu-senha');

    let cliquesSuperAdmin = sessionStorage.getItem('cliques_admin') ? parseInt(sessionStorage.getItem('cliques_admin')) : 0;

    // Mascote Hard Refresh
    if (mascote) {
        mascote.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload(true);
        });
    }

    // Gatilho Super Admin
    if (gatilhoSuperAdmin) {
        gatilhoSuperAdmin.addEventListener('click', () => {
            cliquesSuperAdmin++;
            sessionStorage.setItem('cliques_admin', cliquesSuperAdmin);
            if (cliquesSuperAdmin >= 5) {
                window.location.href = '../super-admin/super-admin.html';
            }
        });
    }

    // Modais
    if (btnAbrirCadastro) btnAbrirCadastro.addEventListener('click', () => modalCadastro.classList.remove('hidden'));
    if (btnFecharModal) btnFecharModal.addEventListener('click', () => modalCadastro.classList.add('hidden'));

    // ViaCEP com preenchimento automático de Endereço, Cidade e UF
    if (inputCep) {
        inputCep.addEventListener('blur', async (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                try {
                    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await res.json();
                    if (!data.erro) {
                        document.getElementById('cad-endereco').value = data.logradouro || '';
                        document.getElementById('cad-cidade').value = data.localidade || '';
                        document.getElementById('cad-estado').value = data.uf || '';
                        inputCep.classList.remove('border-red-500');
                    } else {
                        inputCep.classList.add('border-red-500');
                        alert('CEP não encontrado.');
                    }
                } catch (err) {
                    console.error('Erro ao buscar CEP:', err);
                }
            }
        });
    }

    // Validação com destaque vermelho em caso de erro nos campos obrigatórios
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = formCadastro.querySelectorAll('input');
            let formValido = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add('border-red-500');
                    formValido = false;
                } else {
                    input.classList.remove('border-red-500');
                }
            });

            if (!formValido) {
                alert('Por favor, preencha todos os campos destacados em vermelho.');
                return;
            }

            const nomeEmpresa = document.getElementById('cad-nome-empresa').value;
            const cnpj = document.getElementById('cad-cnpj').value;
            const whatsapp = document.getElementById('cad-whatsapp').value;
            const cep = document.getElementById('cad-cep').value;
            const endereco = document.getElementById('cad-endereco').value;
            const numero = document.getElementById('cad-numero').value;
            const cidade = document.getElementById('cad-cidade').value;
            const estado = document.getElementById('cad-estado').value;
            const responsavel = document.getElementById('cad-responsavel').value;
            const email = document.getElementById('cad-email').value;
            const senha = document.getElementById('cad-senha').value;

            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha });
            if (authError) {
                alert('Erro ao registar credenciais: ' + authError.message);
                return;
            }

            const { error: dbError } = await supabase.from('empresas').insert([{
                id: authData.user?.id,
                nome_empresa: nomeEmpresa,
                cnpj_cpf: cnpj,
                whatsapp,
                cep,
                endereco,
                numero,
                cidade,
                estado,
                nome_responsavel: responsavel,
                email,
                plano: 'comum_enterprise',
                limite_produtos: 1000,
                limite_operadores: 1,
                dias_restantes: 15
            }]);

            if (dbError) {
                alert('Erro ao salvar dados da empresa: ' + dbError.message);
            } else {
                alert('Empresa cadastrada com sucesso! Faça login.');
                modalCadastro.classList.add('hidden');
                formCadastro.reset();
            }
        });
    }

    // Recuperação de Senha
    if (btnEsqueceuSenha) {
        btnEsqueceuSenha.addEventListener('click', async () => {
            const email = prompt('Digite o seu e-mail cadastrado para redefinir a senha:');
            if (!email) return;

            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                alert('Erro ao enviar e-mail: ' + error.message);
            } else {
                alert('Instruções enviadas para o seu e-mail!');
            }
        });
    }

    // Login Real
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;

            const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
            if (error) {
                alert('Erro no login: ' + error.message);
                return;
            }

            alert('Login efetuado com sucesso!');
            window.location.href = '../pdv/caixa-core.html';
        });
    }
});