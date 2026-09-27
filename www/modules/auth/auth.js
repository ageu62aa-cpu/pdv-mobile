import { supabase } from '../../core/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputSenha = document.getElementById('login-senha');
    const mascote = document.getElementById('mascote-container');
    const gatilhoSuperAdmin = document.getElementById('gatilho-super-admin');
    const btnAbrirCadastro = document.getElementById('btn-abrir-cadastro');
    const modalCadastro = document.getElementById('modal-cadastro');
    const btnFecharModal = document.getElementById('modal-close-btn');
    const formCadastro = document.getElementById('form-cadastro-empresa');
    const inputCep = document.getElementById('cad-cep');
    const btnEsqueceuSenha = document.getElementById('btn-esqueceu-senha');

    let cliquesSuperAdmin = sessionStorage.getItem('cliques_admin') ? parseInt(sessionStorage.getItem('cliques_admin')) : 0;

    // Garante a existência do elemento de feedback visual dinamicamente no rodapé do form de login
    let authFeedback = document.getElementById('auth-feedback');
    if (!authFeedback && formLogin) {
        authFeedback = document.createElement('div');
        authFeedback.id = 'auth-feedback';
        authFeedback.className = 'mt-3 text-center text-xs font-medium transition-all duration-300 hidden';
        formLogin.appendChild(authFeedback);
    }

    // Função sênior para gerenciar os avisos visuais inline (Esmeralda / Vermelho)
    function showFeedback(message, type) {
        if (!authFeedback) return;
        
        authFeedback.className = "mt-3 text-center text-xs font-medium transition-all duration-300 py-2 px-3 rounded-lg";
        
        if (type === 'success') {
            authFeedback.classList.add('text-emerald-400', 'bg-emerald-950/40', 'border', 'border-emerald-500/30');
            authFeedback.innerText = "Login Sucesso";
            
            if (inputEmail) inputEmail.classList.remove('border-red-500');
            if (inputSenha) inputSenha.classList.remove('border-red-500');
        } else if (type === 'error') {
            authFeedback.classList.add('text-rose-400', 'bg-rose-950/40', 'border', 'border-rose-500/30');
            authFeedback.innerText = message || "Login Invalido";
            
            if (inputEmail) inputEmail.classList.add('border-red-500');
            if (inputSenha) inputSenha.classList.add('border-red-500');
        }
        
        authFeedback.classList.remove('hidden');
    }

    // Limpa o destaque vermelho e o aviso do login ao redigitar
    [inputEmail, inputSenha].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.classList.remove('border-red-500');
                if (authFeedback && !authFeedback.classList.contains('text-emerald-400')) {
                    authFeedback.classList.add('hidden');
                }
            });
        }
    });

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

    // Limpa a borda vermelha dos campos do cadastro conforme o usuário digita
    if (formCadastro) {
        const inputsCadastro = formCadastro.querySelectorAll('input');
        inputsCadastro.forEach(input => {
            input.addEventListener('input', () => {
                if (input.value.trim()) {
                    input.classList.remove('border-red-500');
                }
            });
        });

        // Validação com destaque vermelho nos campos obrigatórios do cadastro
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            let formValido = true;

            inputsCadastro.forEach(input => {
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
                dias_restantes: 30
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

    // Login Real com Feedback Visual Discreto e Destaque nas Bordas dos Campos
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = inputEmail.value;
            const senha = inputSenha.value;

            if (authFeedback) authFeedback.classList.add('hidden');

            const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
            
            if (error) {
                showFeedback('Login Invalido', 'error');
                return;
            }

            showFeedback('Login Sucesso', 'success');
            
            setTimeout(() => {
                window.location.href = '../pdv/caixa-core.html';
            }, 700);
        });
    }
});