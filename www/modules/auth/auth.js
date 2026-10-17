import { supabase, adminSupabase } from '../../core/config.js';
import { ativarSessaoUnica, isolarSessaoAdministrativa } from '../../core/sessaoService.js';

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

    // Elemento de feedback visual dinâmico para o Login
    let authFeedback = document.getElementById('auth-feedback');
    if (!authFeedback && formLogin) {
        authFeedback = document.createElement('div');
        authFeedback.id = 'auth-feedback';
        authFeedback.className = 'mt-3 text-center text-xs font-medium transition-all duration-300 hidden';
        formLogin.appendChild(authFeedback);
    }

    // Elemento de feedback visual dinâmico para o Cadastro de Empresa
    let cadastroFeedback = document.getElementById('cadastro-feedback');
    if (!cadastroFeedback && formCadastro) {
        cadastroFeedback = document.createElement('div');
        cadastroFeedback.id = 'cadastro-feedback';
        cadastroFeedback.className = 'mt-3 text-center text-xs font-medium transition-all duration-300 hidden';
        formCadastro.appendChild(cadastroFeedback);
    }

    // Função para gerenciar os avisos do Login
    function showLoginFeedback(message, type) {
        if (!authFeedback) return;
        authFeedback.className = "mt-3 text-center text-xs font-medium transition-all duration-300 py-2 px-3 rounded-lg";
        
        if (type === 'success') {
            authFeedback.classList.add('text-emerald-400', 'bg-emerald-950/40', 'border', 'border-emerald-500/30');
            authFeedback.innerText = message || "Sucesso";
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

    // Função para gerenciar os avisos do Cadastro de Empresa
    function showCadastroFeedback(message, type) {
        if (!cadastroFeedback) return;
        cadastroFeedback.className = "mt-3 text-center text-xs font-medium transition-all duration-300 py-2 px-3 rounded-lg";
        
        if (type === 'success') {
            cadastroFeedback.classList.add('text-emerald-400', 'bg-emerald-950/40', 'border', 'border-emerald-500/30');
            cadastroFeedback.innerText = message || "Empresa cadastrada com sucesso! Faça login.";
        } else if (type === 'error') {
            cadastroFeedback.classList.add('text-rose-400', 'bg-rose-950/40', 'border', 'border-rose-500/30');
            cadastroFeedback.innerText = message || "Verifique os campos destacados.";
        }
        cadastroFeedback.classList.remove('hidden');
    }

    // Limpa borda vermelha e avisos ao redigitar no login
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
    if (btnAbrirCadastro) btnAbrirCadastro.addEventListener('click', () => {
        modalCadastro.classList.remove('hidden');
        if (cadastroFeedback) cadastroFeedback.classList.add('hidden');
    });
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
                        showCadastroFeedback('CEP não encontrado.', 'error');
                    }
                } catch (err) {
                    console.error('Erro ao buscar CEP:', err);
                }
            }
        });
    }

    // Limpa bordas vermelhas do cadastro conforme o usuário interage
    if (formCadastro) {
        const inputsCadastro = formCadastro.querySelectorAll('input');
        inputsCadastro.forEach(input => {
            input.addEventListener('input', () => {
                if (input.value.trim()) {
                    input.classList.remove('border-red-500');
                }
            });
        });

        // Validação e Cadastro com feedback visual moderno (Sem alerts)
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            let formValido = true;
            let primeiroCampoComErro = null;

            inputsCadastro.forEach(input => {
                if (!input.value.trim()) {
                    input.classList.add('border-red-500');
                    formValido = false;
                    if (!primeiroCampoComErro) primeiroCampoComErro = input;
                } else {
                    input.classList.remove('border-red-500');
                }
            });

            if (!formValido) {
                showCadastroFeedback('Preencha todos os campos destacados em vermelho.', 'error');
                if (primeiroCampoComErro) primeiroCampoComErro.focus();
                return;
            }

            if (cadastroFeedback) cadastroFeedback.classList.add('hidden');

            const nomeEmpresa = document.getElementById('cad-nome-empresa').value;
            const cnpj = document.getElementById('cad-cnpj').value;
            const cnpjVal = cnpj;
            const whatsapp = document.getElementById('cad-whatsapp').value;
            const cep = document.getElementById('cad-cep').value;
            const endereco = document.getElementById('cad-endereco').value;
            const numero = document.getElementById('cad-numero').value;
            const cidade = document.getElementById('cad-cidade').value;
            const estado = document.getElementById('cad-estado').value;
            const responsavel = document.getElementById('cad-responsavel').value;
            const email = document.getElementById('cad-email').value.trim().toLowerCase();
            const senha = document.getElementById('cad-senha').value;
            const botaoCadastro = formCadastro.querySelector('button[type="submit"]');

            if (senha.length < 6) {
                const inputSenhaCad = document.getElementById('cad-senha');
                if (inputSenhaCad) inputSenhaCad.classList.add('border-red-500');
                showCadastroFeedback('A senha deve conter no mínimo 6 caracteres.', 'error');
                return;
            }

            if (botaoCadastro) {
                botaoCadastro.disabled = true;
                botaoCadastro.textContent = 'Concluindo cadastro...';
            }

            try {
                let { data: authData, error: authError } = await supabase.auth.signUp({ email, password: senha });
                const contaExistente = authError && (
                    authError.code === 'user_already_exists'
                    || /already registered|already exists/i.test(authError.message || '')
                );

                if (contaExistente) {
                    const recuperacao = await supabase.auth.signInWithPassword({ email, password: senha });
                    authData = recuperacao.data;
                    authError = recuperacao.error;
                    if (authError) {
                        showCadastroFeedback('Este e-mail já possui uma conta. Entre com a senha dessa conta ou use a recuperação de senha.', 'error');
                        return;
                    }
                }

                if (authError) {
                    let msgErro = `Erro ao criar acesso: ${authError.message}`;
                    if (authError.message.includes('Password should be at least')) {
                        msgErro = 'A senha precisa ter pelo menos 6 caracteres.';
                        const inputSenhaCad = document.getElementById('cad-senha');
                        if (inputSenhaCad) inputSenhaCad.classList.add('border-red-500');
                    } else if (authError.message.includes('Invalid email')) {
                        msgErro = 'E-mail inválido. Verifique o formato.';
                        const inputEmailCad = document.getElementById('cad-email');
                        if (inputEmailCad) inputEmailCad.classList.add('border-red-500');
                    }
                    showCadastroFeedback(msgErro, 'error');
                    return;
                }

                if (!authData?.user) {
                    throw new Error('O Supabase não retornou o usuário criado.');
                }

                const { error: dbError } = await supabase.from('empresas').insert([{
                    id: authData.user.id,
                    nome_mercado: nomeEmpresa.trim(),
                    nome_empresa: nomeEmpresa.trim(),
                    cnpj: cnpj,
                    documento: cnpj,
                    whatsapp,
                    cep,
                    endereco,
                    numero,
                    cidade,
                    estado,
                    responsavel: responsavel.trim(),
                    nome_responsavel: responsavel.trim(),
                    email,
                    email_admin: email,
                    plano: 'comum_enterprise',
                    limite_produtos: 1000,
                    limite_operadores: 1,
                    dias_restantes: 30
                }]);

                if (dbError) {
                    const detalhe = [
                        dbError.message,
                        dbError.details,
                        dbError.hint,
                        dbError.code ? `Código: ${dbError.code}` : ''
                    ].filter(Boolean).join(' — ');
                    console.error(`Erro ao gravar os dados da nova empresa: ${detalhe}`, dbError);
                    showCadastroFeedback(`A conta de acesso foi criada, mas não foi possível salvar a empresa: ${detalhe}`, 'error');
                    return;
                }

                showCadastroFeedback('Empresa cadastrada com sucesso! Faça login.', 'success');
                setTimeout(() => {
                    modalCadastro.classList.add('hidden');
                    formCadastro.reset();
                    if (cadastroFeedback) cadastroFeedback.classList.add('hidden');
                }, 1500);
            } catch (error) {
                console.error('Falha inesperada durante o cadastro da empresa:', error);
                showCadastroFeedback(`Não foi possível concluir o cadastro: ${error.message || error}`, 'error');
            } finally {
                if (botaoCadastro) {
                    botaoCadastro.disabled = false;
                    botaoCadastro.textContent = 'Concluir Cadastro (30 dias Teste Grátis)';
                }
            }
        });
    }

    // =========================================================================
    // TRATAMENTO UNIFICADO DE RECUPERAÇÃO E ALTERAÇÃO DE SENHA NA PRÓPRIA TELA
    // =========================================================================

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            if (formLogin) {
                formLogin.innerHTML = `
                    <div class="text-center mb-2">
                        <span class="text-xs font-bold text-emerald-400 uppercase">Redefinição de Senha</span>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-300 uppercase">Nova Senha</label>
                        <input type="password" id="nova-senha-input" required class="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="********">
                    </div>
                    <button type="button" id="btn-salvar-nova-senha" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg">
                        Salvar Nova Senha
                    </button>
                `;

                const btnSalvar = document.getElementById('btn-salvar-nova-senha');
                btnSalvar.addEventListener('click', async () => {
                    const novaSenhaInput = document.getElementById('nova-senha-input');
                    const novaSenha = novaSenhaInput.value;

                    if (!novaSenha || novaSenha.length < 6) {
                        novaSenhaInput.classList.add('border-red-500');
                        showLoginFeedback('A senha deve ter pelo menos 6 caracteres.', 'error');
                        return;
                    }

                    const { error } = await supabase.auth.updateUser({ password: novaSenha });
                    if (error) {
                        showLoginFeedback('Erro ao atualizar: ' + error.message, 'error');
                    } else {
                        showLoginFeedback('Senha alterada com sucesso! Redirecionando...', 'success');
                        setTimeout(() => {
                            window.location.href = 'auth.html';
                        }, 2000);
                    }
                });
            }
        }
    });

    // Recuperação lendo APENAS o e-mail preenchido (ignorando completamente a senha)
    if (btnEsqueceuSenha) {
        btnEsqueceuSenha.addEventListener('click', async () => {
            const emailDigitado = inputEmail ? inputEmail.value.trim() : '';

            if (!emailDigitado) {
                if (inputEmail) inputEmail.classList.add('border-red-500');
                showLoginFeedback('Digite o seu e-mail no campo acima para recuperar a senha.', 'error');
                if (inputEmail) inputEmail.focus();
                return;
            }

            // Desativa o botão temporariamente para evitar cliques duplos (erro 429)
            btnEsqueceuSenha.style.pointerEvents = 'none';
            showLoginFeedback('Enviando instruções para o e-mail...', 'success');

            const { error } = await supabase.auth.resetPasswordForEmail(emailDigitado, {
                redirectTo: 'https://pdv-mobile.vercel.app/modules/auth/auth.html'
            });

            setTimeout(() => {
                btnEsqueceuSenha.style.pointerEvents = 'auto';
            }, 5000);

            if (error) {
                showLoginFeedback('Erro ao enviar: ' + error.message, 'error');
            } else {
                showLoginFeedback('E-mail de recuperação enviado com sucesso!', 'success');
            }
        });
    }

    // Login Real com Verificação Inteligente (Admin ou Operador via usuarios_empresas)
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = inputEmail.value.trim();
            const senha = inputSenha.value.trim();
            const botaoLogin = formLogin.querySelector('button[type="submit"]');

            if (authFeedback) authFeedback.classList.add('hidden');
            if (botaoLogin) botaoLogin.disabled = true;

            try {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: senha });
                if (authError || !authData.user) {
                    showLoginFeedback('Login inválido. Verifique e-mail e senha.', 'error');
                    return;
                }

                const user = authData.user;

                const { data: vinculo, error: vinculoError } = await supabase
                    .from('usuarios_empresas')
                    .select('user_id, empresa_id, cargo')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (vinculoError) {
                    if (vinculoError.code === 'PGRST116') {
                        throw new Error('Há mais de um vínculo de empresa para este usuário. Regularize o cadastro para definir uma empresa ativa.');
                    }
                    throw vinculoError;
                }

                let empresaId = vinculo?.empresa_id || null;
                let cargo = vinculo?.cargo || null;
                if (empresaId) {
                    const { data: empresaVinculada, error: erroEmpresaVinculada } = await supabase
                        .from('empresas')
                        .select('id, email_admin')
                        .eq('id', empresaId)
                        .maybeSingle();
                    if (erroEmpresaVinculada) throw erroEmpresaVinculada;
                    if (empresaVinculada
                        && String(empresaVinculada.email_admin || '').trim().toLowerCase() === String(user.email || '').trim().toLowerCase()) {
                        cargo = 'admin_mercado';
                    }
                }
                if ((!empresaId || !cargo) && user.email) {
                    const { data: empresa, error: erroEmpresa } = await supabase
                        .from('empresas')
                        .select('id, email_admin')
                        .eq('email_admin', user.email)
                        .maybeSingle();
                    if (erroEmpresa) throw erroEmpresa;
                    if (empresa) {
                        empresaId = empresaId || empresa.id;
                        cargo = cargo || 'admin_mercado';
                    }
                }

                if (!empresaId) {
                    showLoginFeedback('Não foi possível localizar uma empresa vinculada a este usuário. Peça ao administrador para conferir o vínculo do operador.', 'error');
                    return;
                }
                if (cargo !== 'admin_mercado' && cargo !== 'operador') {
                    showLoginFeedback('Este usuário não tem um perfil autorizado para acessar o caixa.', 'error');
                    return;
                }

                localStorage.setItem('empresa_id', empresaId);
                localStorage.setItem('empresaAtualId', empresaId);
                localStorage.setItem('pdv_empresa_id', empresaId);
                localStorage.setItem('usuario', JSON.stringify(user));

                if (cargo === 'admin_mercado') {
                    await isolarSessaoAdministrativa(supabase, adminSupabase, user, empresaId);
                    showLoginFeedback('Login de administrador realizado com sucesso.', 'success');
                    setTimeout(() => {
                        window.location.href = '../admin/admin.html';
                    }, 700);
                } else {
                    const tokenSessao = await ativarSessaoUnica(supabase, user.id);
                    if (!tokenSessao) {
                        throw new Error('Não foi possível registrar a sessão do operador.');
                    }
                    localStorage.setItem('operador_logado_id', user.id);
                    localStorage.setItem('operador_logado_user_id', user.id);
                    showLoginFeedback('Login de operador realizado com sucesso.', 'success');
                    setTimeout(() => {
                        window.location.href = '../pdv/operador.html';
                    }, 700);
                }
            } catch (error) {
                console.error('PDV-VS: Erro ao validar usuário e empresa durante o login:', error);
                showLoginFeedback(`Não foi possível validar o vínculo com a empresa: ${error.message}`, 'error');
            } finally {
                if (botaoLogin) botaoLogin.disabled = false;
            }
        });
    }
});