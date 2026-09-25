// ==========================================
// MÓDULO DE GESTÃO ADMINISTRATIVA DA LOJA (PDV-VS)
// ==========================================

// Importação ajustada com extensão .js explícita para compatibilidade total com ES Modules no Vercel
import { 
    empresaAtualId, produtosCache, cargoUsuarioAtual, historicoVendasCache, 
    setHistoricoVendasCache, setProdutosCache, setEmpresaAtualId 
} from './state.js';
import { carregarProdutosCache } from './produtos.js';
import { focarBusca } from './caixa.js';

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

// ==========================================
// FUNÇÕES DE AUTENTICAÇÃO (LOGIN / ENTER)
// ==========================================
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
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

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
                if (modalAdmin) {
                    modalAdmin.classList.add('hidden');
                }
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

// ==========================================
// FLUXO DE CADASTRO DE ESTABELECIMENTO
// ==========================================
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
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email,
            password
        });

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

            alert('PDV-VS: Estabelecimento cadastrado com sucesso! Redirecionando para a tela de login...');

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

// ==========================================
// NAVEGAÇÃO DE ABAS
// ==========================================
export async function mudarAbaAdmin(aba) {
    const abasPossiveis = ['Produtos', 'Operadores', 'Maquininhas', 'Historico', 'Configuracoes'];
    
    abasPossiveis.forEach(a => {
        const conteudo = document.getElementById(`conteudoAba${a}`);
        const btn = document.getElementById(`btnAba${a}`);
        if (conteudo) conteudo.classList.add('hidden');
        if (btn) btn.className = 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg';
    });
    
    const activeAba = aba.charAt(0).toUpperCase() + aba.slice(1);
    const conteudoAtivo = document.getElementById(`conteudoAba${activeAba}`);
    const btnAtivo = document.getElementById(`btnAba${activeAba}`);
    
    if (conteudoAtivo) conteudoAtivo.classList.remove('hidden');
    if (btnAtivo) btnAtivo.className = 'px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg';
    
    switch (activeAba) {
        case 'Produtos':
            await carregarProdutosCache();
            renderizarTabelaAdmin(produtosCache);
            break;
        case 'Operadores':
            await carregarOperadoresLoja();
            break;
        case 'Maquininhas':
            await carregarMaquininhasAdmin();
            break;
        case 'Historico':
            await carregarHistoricoAdmin();
            break;
        case 'Configuracoes':
            preencherDadosConfiguracao();
            break;
    }
}

function preencherDadosConfiguracao() {
    const inputPinConfig = document.getElementById('inputAdminPinConfig');
    if (inputPinConfig) {
        inputPinConfig.value = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
    }
    const inputNomeConfig = document.getElementById('inputAdminNomeEmpresaConfig');
    const inputWapConfig = document.getElementById('inputAdminWhatsappConfig');
    if (window.dadosEmpresaAtual) {
        if (inputNomeConfig) inputNomeConfig.value = window.dadosEmpresaAtual.nome_mercado || '';
        if (inputWapConfig) inputWapConfig.value = window.dadosEmpresaAtual.whatsapp || '';
    }
}

export async function recarregarDadosAdmin() {
    await carregarProdutosCache();
    renderizarTabelaAdmin(produtosCache);
    if (cargoUsuarioAtual === 'admin_mercado') {
        await Promise.all([
            carregarHistoricoAdmin(),
            carregarOperadoresLoja(),
            carregarMaquininhasAdmin()
        ]);
    }
    alert('PDV-VS: Dados do painel administrativo atualizados com sucesso!');
}

export async function abrirPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('flex');
        modalAdmin.classList.remove('hidden'); 
    }

    await resolverEmpresaIdAtual();

    try {
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
        
        if (cargoUsuarioAtual === 'admin_mercado') {
            await Promise.all([
                carregarOperadoresLoja(),
                carregarHistoricoAdmin(),
                carregarMaquininhasAdmin()
            ]);
        }
    } catch (e) {
        console.error("PDV-VS: Erro ao carregar dados do painel:", e);
    }

    mudarAbaAdmin('produtos'); 
}

export function fecharPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('hidden'); 
        modalAdmin.classList.remove('flex');
    }
    focarBusca();
}

// ==========================================
// GESTÃO DE PRODUTOS (ADMIN)
// ==========================================
export function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contadorProdutos = document.getElementById('contadorLimiteProdutosAdmin');
    
    const limiteMaximo = 1000;
    const qtdAtual = produtosCache.length;
    const vagasDisponiveis = Math.max(0, limiteMaximo - qtdAtual);

    if (contadorProdutos) {
        contadorProdutos.innerText = `${qtdAtual} cadastrados | Restam ${vagasDisponiveis} vagas (Máx: ${limiteMaximo})`;
    }

    if (!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b">
            <td class="p-2 text-xs">${p.codigo || '-'}</td>
            <td class="p-2 font-medium">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-600 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-2">R$ ${Number(p.preco).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-2">${p.estoque} ${p.unidade || 'UN'}</td>
            <td class="p-2 text-center">
                <button onclick="window.abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque}, '${p.unidade || 'UN'}')" class="text-blue-500 hover:text-blue-700 mr-3"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.excluirProdutoAdmin(${p.id})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
}

export function filtrarTabelaAdmin(t) { 
    const termo = t.toLowerCase();
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(termo) || (p.codigo && p.codigo.toLowerCase().includes(termo)))); 
}

export function abrirModalNovoProdutoAdmin() {
    if (produtosCache.length >= 1000) {
        alert('PDV-VS - Aviso do Plano: Você atingiu o limite máximo de 1.000 produtos cadastrados.');
        return;
    }

    alternarCamposFormProduto({ id: '', nome: '', codigo: '', preco: '', estoque: '', unidade: 'UN' });
    document.getElementById('modalFormProduto')?.classList.remove('hidden');
}

export function abrirEditarProdutoAdmin(id, nome, cod, preco, est, unidade = 'UN') {
    alternarCamposFormProduto({ id, nome, codigo: cod, preco, estoque: est, unidade });
    document.getElementById('modalFormProduto')?.classList.remove('hidden');
}

function alternarCamposFormProduto(dados) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('formProdId', dados.id);
    setVal('formNome', dados.nome);
    setVal('formCodigo', dados.codigo);
    setVal('formPreco', dados.preco);
    setVal('formEstoque', dados.estoque);
    setVal('formUnidade', dados.unidade);
}

export function fecharFormProduto() { 
    document.getElementById('modalFormProduto')?.classList.add('hidden'); 
}

export async function salvarProdutoAdmin() {
    const idEmpresa = await resolverEmpresaIdAtual();
    if (!idEmpresa) {
        alert('PDV-VS Erro Crítico: ID da empresa não encontrado. Faça login novamente.');
        return;
    }

    const id = document.getElementById('formProdId')?.value || '';
    const p = { 
        empresa_id: idEmpresa,
        nome: document.getElementById('formNome')?.value.trim() || '', 
        codigo: document.getElementById('formCodigo')?.value.trim() || '', 
        preco: parseFloat(document.getElementById('formPreco')?.value) || 0, 
        estoque: parseFloat(document.getElementById('formEstoque')?.value) || 0,
        unidade: document.getElementById('formUnidade')?.value || 'UN'
    };

    if (!p.nome) {
        alert('PDV-VS: Informe o nome do produto.');
        return;
    }
    
    if (id) { 
        const { error } = await window.supabaseClient.from('produtos').update(p).eq('id', id); 
        if (error) { alert('Erro ao atualizar produto: ' + error.message); return; }
    } else { 
        if (produtosCache.length >= 1000) {
            alert('PDV-VS: Limite de 1.000 produtos atingido.');
            return;
        }
        const { error } = await window.supabaseClient.from('produtos').insert([p]); 
        if (error) { alert('Erro ao inserir produto: ' + error.message); return; }
    }
    
    fecharFormProduto(); 
    await carregarProdutosCache(); 
    renderizarTabelaAdmin(produtosCache);
    alert('PDV-VS: Produto salvo com sucesso!');
}

export async function excluirProdutoAdmin(id) { 
    if (confirm('PDV-VS: Deseja excluir este item permanentemente?')) { 
        await window.supabaseClient.from('produtos').delete().eq('id', id); 
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
    } 
}

// ==========================================
// GESTÃO DE MAQUININHAS E TAXAS
// ==========================================
export async function carregarMaquininhasAdmin() {
    if (!empresaAtualId) return;
    const { data, error } = await window.supabaseClient
        .from('maquininhas_taxas')
        .select('*')
        .eq('empresa_id', empresaAtualId);

    const tbody = document.getElementById('tabelaMaquininhasAdmin');
    if (!tbody) return;

    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma maquininha cadastrada.</td></tr>';
        return;
    }

    let html = '';
    data.forEach(m => {
        html += `<tr class="border-b">
            <td class="p-3 font-bold text-slate-800">${m.nome_maquina}</td>
            <td class="p-3">Débito: ${m.taxa_debito}% | Créd. À Vista: ${m.taxa_credito_avista}%</td>
            <td class="p-3 text-xs text-slate-600">Parcelado configurado</td>
            <td class="p-3 text-center">
                <button onclick="window.excluirMaquininhaAdmin(${m.id})" class="text-rose-600 hover:text-rose-800 text-xs font-bold"><i class="fa-solid fa-trash"></i> Excluir</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

export function abrirModalNovaMaquininha() { document.getElementById('modalNovaMaquininha')?.classList.remove('hidden'); }
export function fecharModalNovaMaquininha() { document.getElementById('modalNovaMaquininha')?.classList.add('hidden'); }

export async function salvarNovaMaquininha() {
    const nome = document.getElementById('maqNome')?.value.trim();
    if (!nome) { alert('Informe o nome da maquininha (Ex: Ton, Stone)'); return; }

    const taxasObj = {
        "2": parseFloat(document.getElementById('maq2x')?.value) || 0,
        "3": parseFloat(document.getElementById('maq3x')?.value) || 0,
        "6": parseFloat(document.getElementById('maq6x')?.value) || 0,
        "12": parseFloat(document.getElementById('maq12x')?.value) || 0
    };

    const { error } = await window.supabaseClient.from('maquininhas_taxas').insert([{
        empresa_id: empresaAtualId,
        nome_maquina: nome,
        taxa_debito: parseFloat(document.getElementById('maqDebito')?.value) || 0,
        taxa_credito_avista: parseFloat(document.getElementById('maqCreditoAvista')?.value) || 0,
        taxas_parcelamento: taxasObj
    }]);

    if (error) { alert('Erro ao salvar maquininha: ' + error.message); return; }

    fecharModalNovaMaquininha();
    await carregarMaquininhasAdmin();
    alert('Maquininha cadastrada com sucesso!');
}

export async function excluirMaquininhaAdmin(id) {
    if (confirm('Deseja realmente excluir esta maquininha?')) {
        await window.supabaseClient.from('maquininhas_taxas').delete().eq('id', id);
        await carregarMaquininhasAdmin();
    }
}

// ==========================================
// GESTÃO DE OPERADORES DA LOJA
// ==========================================
export async function carregarOperadoresLoja() {
    if (!empresaAtualId) return;

    const [{ data: operadores }, { data: caixasAbertos }] = await Promise.all([
        window.supabaseClient.from('usuarios_empresas').select('*').eq('empresa_id', empresaAtualId),
        window.supabaseClient.from('caixas').select('user_id, status, faturamento_dia').eq('empresa_id', empresaAtualId).eq('status', 'ABERTO')
    ]);

    const mapaCaixas = {};
    (caixasAbertos || []).forEach(c => { mapaCaixas[c.user_id] = c; });

    let html = '';
    if (operadores && operadores.length > 0) {
        operadores.forEach(op => {
            const caixaInfo = mapaCaixas[op.user_id];
            const faturamentoAtual = caixaInfo ? Number(caixaInfo.faturamento_dia || 0) : 0;
            const statusCaixaBadge = caixaInfo 
                ? `<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">ABERTO (Fat: R$ ${faturamentoAtual.toFixed(2)})</span>` 
                : '<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">FECHADO</span>';
            
            const cargoNome = op.cargo === 'admin_mercado' ? 'Administrador' : 'Operador de Caixa';

            html += `<tr class="border-b">
                <td class="p-3 text-xs font-mono">${op.user_id}</td>
                <td class="p-3 font-semibold text-slate-800">${cargoNome}</td>
                <td class="p-3 text-center">${statusCaixaBadge}</td>
                <td class="p-3 text-center">
                    ${op.cargo !== 'admin_mercado' ? `<button onclick="window.excluirOperadorLoja('${op.user_id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Remover</button>` : '<span class="text-xs text-slate-400">Principal</span>'}
                </td>
            </tr>`;
        });
    }
    const tabelaOps = document.getElementById('tabelaOperadoresLoja');
    if (tabelaOps) tabelaOps.innerHTML = html || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum operador cadastrado.</td></tr>';
}

export async function excluirOperadorLoja(id) { 
    if (confirm('PDV-VS: Deseja remover este operador da equipe?')) { 
        await window.supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        await carregarOperadoresLoja(); 
    } 
}

export function abrirModalNovoOperador() { 
    window.supabaseClient.from('usuarios_empresas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtualId).eq('cargo', 'operador').then(({ count }) => {
        if (count >= 1) {
            alert('PDV-VS - Regra do Plano: É permitido apenas 1 operador adicional além do Administrador.');
            return;
        }
        document.getElementById('modalNovoOperador')?.classList.remove('hidden'); 
    });
}

export function fecharModalNovoOperador() { document.getElementById('modalNovoOperador')?.classList.add('hidden'); }

export async function salvarNovoOperador() {
    const email = document.getElementById('novoOpEmail')?.value.trim() || '';
    const password = document.getElementById('novoOpSenha')?.value.trim() || '';

    if (!email || !password) { alert('PDV-VS: Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
    if (error) { alert('PDV-VS: Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await window.supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        await carregarOperadoresLoja();
        alert('PDV-VS: Operador cadastrado com sucesso!');
    }
}

// ==========================================
// HISTÓRICO DE VENDAS E CONFIGURAÇÕES
// ==========================================
export async function carregarHistoricoAdmin() {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 15);

    const { data } = await window.supabaseClient.from('vendas')
        .select('*')
        .eq('empresa_id', empresaAtualId)
        .gte('created_at', dataLimite.toISOString())
        .order('created_at', { ascending: false });

    setHistoricoVendasCache(data || []); 
    renderizarHistoricoVendasPorJanelasDiarias();
}

export function renderizarHistoricoVendasPorJanelasDiarias() {
    const container = document.getElementById('containerJanelasFaturamentoDiario');
    const lblFatHoje = document.getElementById('adminFatHoje');
    const lblFatSemanal = document.getElementById('adminFatSemanal');
    const lblFatTotal = document.getElementById('adminFatTotal15Dias');

    if (!container) return;

    if (!historicoVendasCache || historicoVendasCache.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400">Nenhuma venda registrada nos últimos 15 dias.</div>';
        if (lblFatHoje) lblFatHoje.innerText = 'R$ 0,00';
        if (lblFatSemanal) lblFatSemanal.innerText = 'R$ 0,00';
        if (lblFatTotal) lblFatTotal.innerText = 'R$ 0,00';
        return;
    }

    let total15Dias = 0, totalHoje = 0, totalSemanal = 0;
    const hojeStr = new Date().toDateString();
    const gruposPorDia = {};

    historicoVendasCache.forEach(v => {
        total15Dias += v.valor_total;
        const dataVenda = new Date(v.created_at);
        const diaKey = dataVenda.toISOString().split('T')[0];

        if (dataVenda.toDateString() === hojeStr) totalHoje += v.valor_total;
        if ((new Date() - dataVenda) / (1000 * 60 * 60 * 24) <= 7) totalSemanal += v.valor_total;

        if (!gruposPorDia[diaKey]) {
            gruposPorDia[diaKey] = { dataStr: dataVenda.toLocaleDateString('pt-BR'), totalDia: 0, vendas: [] };
        }
        gruposPorDia[diaKey].totalDia += v.valor_total;
        gruposPorDia[diaKey].vendas.push(v);
    });

    if (lblFatHoje) lblFatHoje.innerText = `R$ ${totalHoje.toFixed(2)}`;
    if (lblFatSemanal) lblFatSemanal.innerText = `R$ ${totalSemanal.toFixed(2)}`;
    if (lblFatTotal) lblFatTotal.innerText = `R$ ${total15Dias.toFixed(2)}`;

    let htmlJanelas = '';
    Object.keys(gruposPorDia).sort().reverse().forEach((diaKey, idx) => {
        const grupo = gruposPorDia[diaKey];
        const collapseId = `detalheDia_${idx}`;

        let htmlItensVendasDia = '';
        grupo.vendas.forEach(v => {
            const horaVenda = new Date(v.created_at).toLocaleTimeString();
            const itensDesc = v.itens ? v.itens.map(i => i.isPeso ? `${i.nome} (${i.qtd.toFixed(3)}kg)` : `${i.nome} (x${i.qtd})`).join(', ') : 'Itens diversos';
            htmlItensVendasDia += `
                <div class="py-2 px-3 bg-white border-b flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-slate-700">${horaVenda}</span> - <span class="text-slate-600">Op: ${v.operador}</span>
                        <p class="text-[11px] text-slate-500 mt-0.5">${itensDesc}</p>
                    </div>
                    <span class="font-bold text-emerald-700">R$ ${v.valor_total.toFixed(2)}</span>
                </div>`;
        });

        htmlJanelas += `
            <div class="bg-slate-50 border-b">
                <div onclick="const el = document.getElementById('${collapseId}'); el.classList.toggle('hidden');" class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition">
                    <div class="flex items-center space-x-2">
                        <i class="fa-solid fa-calendar-day text-emerald-600"></i>
                        <span class="font-bold text-slate-800 text-sm">Data: ${grupo.dataStr}</span>
                        <span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">${grupo.vendas.length} venda(s)</span>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="font-black text-emerald-700 text-sm">R$ ${grupo.totalDia.toFixed(2)}</span>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400"></i>
                    </div>
                </div>
                <div id="${collapseId}" class="hidden pl-6 pr-3 pb-3 space-y-1 border-t bg-slate-100/60">
                    <div class="py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Detalhamento das Vendas do Dia</div>
                    ${htmlItensVendasDia}
                </div>
            </div>`;
    });

    container.innerHTML = htmlJanelas;
}

export async function salvarConfiguracoesEmpresaAdmin() {
    const novoNome = document.getElementById('inputAdminNomeEmpresaConfig')?.value.trim() || '';
    const novoWap = document.getElementById('inputAdminWhatsappConfig')?.value.trim() || '';

    if (!novoNome) {
        alert('PDV-VS: O nome do estabelecimento não pode ficar vazio.');
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('empresas')
            .update({ nome_mercado: novoNome, whatsapp: novoWap })
            .eq('id', empresaAtualId);

        if (error) throw error;

        const tituloAppEmpresa = document.getElementById('tituloAppEmpresa');
        if (tituloAppEmpresa) tituloAppEmpresa.innerText = novoNome;

        alert('PDV-VS: Dados do estabelecimento atualizados com sucesso!');
    } catch (e) {
        alert('PDV-VS: Erro ao atualizar configurações: ' + e.message);
    }
}

// ==========================================
// REGISTRO GLOBAL DE EXPORTAÇÕES (WINDOW)
// ==========================================
Object.assign(window, {
    processarAutenticacao,
    tratarEnterLogin,
    cadastrarEstabelecimento,
    mudarAbaAdmin, recarregarDadosAdmin, abrirPainelAdmin, fecharPainelAdmin,
    filtrarTabelaAdmin, abrirModalNovoProdutoAdmin, abrirEditarProdutoAdmin,
    fecharFormProduto, salvarProdutoAdmin, excluirProdutoAdmin,
    carregarMaquininhasAdmin, abrirModalNovaMaquininha, fecharModalNovaMaquininha,
    salvarNovaMaquininha, excluirMaquininhaAdmin, carregarOperadoresLoja,
    excluirOperadorLoja, abrirModalNovoOperador, fecharModalNovoOperador,
    salvarNovoOperador, carregarHistoricoAdmin, renderizarHistoricoVendasPorJanelasDiarias,
    salvarConfiguracoesEmpresaAdmin
});