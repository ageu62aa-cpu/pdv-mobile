// Importação do Supabase configurado globalmente no projeto
// Se precisar ajustar o cliente global, certifique-se que o config.js exporta o supabase.
import { supabase } from '../../core/config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mascote - Hard Refresh / Cache Update
    const mascote = document.getElementById('mascote-container');
    if (mascote) {
        mascote.addEventListener('click', () => {
            if (window.caches) {
                caches.keys().then((names) => {
                    names.forEach((name) => { caches.delete(name); });
                });
            }
            window.location.reload(true);
        });
    }

    // 2. Gatilho Super Admin Oculto (5 a 10 cliques rápidos)
    const triggerAdmin = document.getElementById('trigger-super-admin');
    let clickCount = 0;
    let clickTimer = null;

    if (triggerAdmin) {
        triggerAdmin.addEventListener('click', () => {
            clickCount++;
            clearTimeout(clickTimer);
            
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 1000); // Reseta se demorar mais de 1s entre cliques

            if (clickCount >= 5 && clickCount <= 10) {
                // Redireciona para a tela/módulo do Super Admin (Etapa 4)
                window.location.href = '../super-admin/super-admin.html'; // ou rota correspondente
            }
        });
    }

    // 3. Validação Visual de Erros no Login
    const loginForm = document.getElementById('login-form');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');

    function setFieldError(input, errorElement, message) {
        input.classList.add('border-red-500', 'ring-2', 'ring-red-200');
        input.classList.remove('border-gray-300');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function clearFieldError(input, errorElement) {
        input.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
        input.classList.add('border-gray-300');
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldError(inputEmail, errorEmail);
        clearFieldError(inputPassword, errorPassword);

        const email = inputEmail.value.trim();
        const password = inputPassword.value;

        // Autenticação via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setFieldError(inputEmail, errorEmail, 'E-mail ou senha incorretos.');
            setFieldError(inputPassword, errorPassword, 'E-mail ou senha incorretos.');
            return;
        }

        // Sucesso no login - Redirecionar para o PDV principal
        window.location.href = '../pdv/caixa-core.js'; // Ajuste conforme rota de entrada do PDV
    });

    // 4. Esqueci Minha Senha
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    btnForgotPassword.addEventListener('click', async () => {
        const email = prompt('Digite seu e-mail cadastrado para redefinir a senha:');
        if (!email) return;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href,
        });

        if (error) {
            alert('Erro ao enviar e-mail de recuperação: ' + error.message);
        } else {
            alert('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.');
        }
    });

    // 5. Modal de Cadastro de Nova Empresa
    const modalRegister = document.getElementById('modal-register');
    const btnOpenRegister = document.getElementById('btn-open-register');
    const btnCloseRegister = document.getElementById('btn-close-register');
    const btnCancelRegister = document.getElementById('btn-cancel-register');

    function toggleModal(show) {
        if (show) modalRegister.classList.remove('hidden');
        else modalRegister.classList.add('hidden');
    }

    btnOpenRegister.addEventListener('click', () => toggleModal(true));
    btnCloseRegister.addEventListener('click', () => toggleModal(false));
    btnCancelRegister.addEventListener('click', () => toggleModal(false));

    // 6. Integração ViaCEP para preenchimento automático
    const inputCep = document.getElementById('reg-cep');
    const inputCidadeEstado = document.getElementById('reg-cidade-estado');

    inputCep.addEventListener('blur', async () => {
        const cep = inputCep.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    inputCidadeEstado.value = `${data.localidade} - ${data.uf}`;
                } else {
                    inputCidadeEstado.value = 'CEP não encontrado';
                }
            } catch (err) {
                inputCidadeEstado.value = 'Erro ao buscar CEP';
            }
        }
    });

    // 7. Submissão do Cadastro de Nova Empresa
    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('reg-nome').value;
        const empresa = document.getElementById('reg-empresa').value;
        const cnpj = document.getElementById('reg-cnpj').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const cep = document.getElementById('reg-cep').value;
        const cidadeEstado = inputCidadeEstado.value;

        // Criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: nome,
                    company_name: empresa,
                    cnpj: cnpj
                }
            }
        });

        if (authError) {
            alert('Erro ao cadastrar empresa: ' + authError.message);
            return;
        }

        // Inserir dados adicionais na tabela de controle de empresas/planos (ex: plano 15 dias, limite 1000 produtos, 1 operador)
        const { error: dbError } = await supabase.from('empresas').insert([
            {
                user_id: authData.user?.id,
                nome_responsavel: nome,
                nome_empresa: empresa,
                cnpj: cnpj,
                email: email,
                cep: cep,
                cidade_estado: cidadeEstado,
                plano: 'comum_enterprise',
                limite_produtos: 1000,
                limite_operadores: 1, // 1 operador e 1 admin
                dias_restantes: 15,
                criado_em: new Date()
            }
        ]);

        if (dbError) {
            console.error('Aviso ao registrar metadados da empresa:', dbError.message);
        }

        alert('Empresa cadastrada com sucesso! Plano inicial de 15 dias ativado.');
        toggleModal(false);
        registerForm.reset();
    });
});