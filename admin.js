// ==========================================
// MÓDULO DE GESTÃO ADMINISTRATIVA DA LOJA (PDV-VS)
// ==========================================

import { 
    empresaAtualId, produtosCache, cargoUsuarioAtual, historicoVendasCache, 
    setHistoricoVendasCache, setProdutosCache 
} from './state.js';
import { carregarProdutosCache } from './produtos.js';
import { focarBusca } from './caixa.js';

export function mudarAbaAdmin(aba) {
    ['Produtos', 'Operadores', 'Historico', 'Configuracoes'].forEach(a => {
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
    
    if (aba === 'operadores') carregarOperadoresLoja();
    if (aba === 'historico') carregarHistoricoAdmin();
    if (aba === 'configuracoes') {
        const inputPinConfig = document.getElementById('inputAdminPinConfig');
        if (inputPinConfig) {
            inputPinConfig.value = localStorage.getItem('pdv_admin_pin_' + empresaAtualId) || '123456';
        }
    }
}

export async function recarregarDadosAdmin() {
    await carregarProdutosCache();
    renderizarTabelaAdmin(produtosCache);
    if (cargoUsuarioAtual === 'admin_mercado') {
        await carregarHistoricoAdmin();
        await carregarOperadoresLoja();
    }
    alert('PDV-VS: Dados do painel administrativo atualizados com sucesso!');
}

export function abrirPainelAdmin() { 
    renderizarTabelaAdmin(produtosCache); 
    mudarAbaAdmin('produtos'); 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('flex');
        modalAdmin.classList.remove('hidden'); 
    }
}

export function fecharPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('hidden'); 
        modalAdmin.classList.remove('flex');
    }
    focarBusca();
}

export function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contadorProdutos = document.getElementById('contadorLimiteProdutosAdmin');
    if (contadorProdutos) contadorProdutos.innerText = `${produtosCache.length} / 800 produtos`;
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
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(t.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(t.toLowerCase())))); 
}

export function abrirModalNovoProdutoAdmin() {
    if (produtosCache.length >= 800) {
        alert('PDV-VS - Aviso do Plano Comum: Você atingiu o limite máximo de 800 produtos cadastrados.');
        return;
    }

    const prodId = document.getElementById('formProdId');
    const nome = document.getElementById('formNome');
    const codigo = document.getElementById('formCodigo');
    const preco = document.getElementById('formPreco');
    const estoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');
    const modalForm = document.getElementById('modalFormProduto');

    if (prodId) prodId.value = ''; 
    if (nome) nome.value = '';
    if (codigo) codigo.value = ''; 
    if (preco) preco.value = '';
    if (estoque) estoque.value = '';
    if (selectUnidade) selectUnidade.value = 'UN';

    if (modalForm) modalForm.classList.remove('hidden');
}

export function abrirEditarProdutoAdmin(id, nome, cod, preco, est, unidade = 'UN') {
    const prodId = document.getElementById('formProdId');
    const inputNome = document.getElementById('formNome');
    const inputCodigo = document.getElementById('formCodigo');
    const inputPreco = document.getElementById('formPreco');
    const inputEstoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');
    const modalForm = document.getElementById('modalFormProduto');

    if (prodId) prodId.value = id; 
    if (inputNome) inputNome.value = nome;
    if (inputCodigo) inputCodigo.value = cod; 
    if (inputPreco) inputPreco.value = preco;
    if (inputEstoque) inputEstoque.value = est; 
    if (selectUnidade) selectUnidade.value = unidade;

    if (modalForm) modalForm.classList.remove('hidden');
}

export function fecharFormProduto() { 
    const modal = document.getElementById('modalFormProduto');
    if (modal) modal.classList.add('hidden'); 
}

export async function salvarProdutoAdmin() {
    const prodId = document.getElementById('formProdId');
    const nome = document.getElementById('formNome');
    const codigo = document.getElementById('formCodigo');
    const preco = document.getElementById('formPreco');
    const estoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');

    const id = prodId ? prodId.value : '';
    const unidadeProd = selectUnidade ? selectUnidade.value : 'UN';

    const p = { 
        nome: nome ? nome.value : '', 
        codigo: codigo ? codigo.value : '', 
        preco: preco ? parseFloat(preco.value) || 0 : 0, 
        estoque: estoque ? parseFloat(estoque.value) || 0 : 0,
        unidade: unidadeProd
    };
    
    if (id) { 
        await supabaseClient.from('produtos').update(p).eq('id', id); 
    } else { 
        if (produtosCache.length >= 800) {
            alert('PDV-VS: Limite de 800 produtos do plano comum atingido.');
            return;
        }
        await supabaseClient.from('produtos').insert([{ ...p, empresa_id: empresaAtualId }]); 
    }
    
    fecharFormProduto(); 
    await carregarProdutosCache(); 
    renderizarTabelaAdmin(produtosCache);
}

export async function excluirProdutoAdmin(id) { 
    if (confirm('PDV-VS: Deseja excluir este item permanentemente?')) { 
        await supabaseClient.from('produtos').delete().eq('id', id); 
        await carregarProdutosCache(); 
        renderizarTabelaAdmin(produtosCache); 
    } 
}

export async function carregarOperadoresLoja() {
    if (!empresaAtualId) return;

    // Busca os operadores cadastrados na empresa
    const { data: operadores, error } = await supabaseClient
        .from('usuarios_empresas')
        .select('*')
        .eq('empresa_id', empresaAtualId);

    if (error) {
        console.error('Erro ao carregar operadores:', error);
        return;
    }

    // Busca os caixas abertos atuais na tabela 'caixas'
    const { data: caixasAbertos } = await supabaseClient
        .from('caixas')
        .select('user_id, status, faturamento_dia, valor_abertura')
        .eq('empresa_id', empresaAtualId)
        .eq('status', 'ABERTO');

    const mapaCaixas = {};
    if (caixasAbertos) {
        caixasAbertos.forEach(c => {
            mapaCaixas[c.user_id] = c;
        });
    }

    let html = '';
    if (operadores && operadores.length > 0) {
        operadores.forEach(op => {
            const caixaInfo = mapaCaixas[op.user_id];
            const opCaixaAberto = !!caixaInfo;
            const faturamentoAtual = caixaInfo ? Number(caixaInfo.faturamento_dia || 0) : 0;

            const statusCaixaBadge = opCaixaAberto 
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
        await supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        carregarOperadoresLoja(); 
    } 
}

export function abrirModalNovoOperador() { 
    supabaseClient.from('usuarios_empresas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtualId).eq('cargo', 'operador').then(({ count }) => {
        if (count >= 1) {
            alert('PDV-VS - Regra do Plano Comum: É permitido apenas 1 operador adicional além do Administrador.');
            return;
        }
        const modal = document.getElementById('modalNovoOperador');
        if (modal) modal.classList.remove('hidden'); 
    });
}

export function fecharModalNovoOperador() { 
    const modal = document.getElementById('modalNovoOperador');
    if (modal) modal.classList.add('hidden'); 
}

export async function salvarNovoOperador() {
    const inputEmail = document.getElementById('novoOpEmail');
    const inputSenha = document.getElementById('novoOpSenha');
    const email = inputEmail ? inputEmail.value.trim() : '';
    const password = inputSenha ? inputSenha.value.trim() : '';

    if (!email || !password) { alert('PDV-VS: Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { alert('PDV-VS: Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        carregarOperadoresLoja();
        alert('PDV-VS: Operador cadastrado com sucesso!');
    }
}

export async function carregarHistoricoAdmin() {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 15);

    const { data } = await supabaseClient.from('vendas')
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

    let total15Dias = 0;
    let totalHoje = 0;
    let totalSemanal = 0;
    const hojeStr = new Date().toDateString();

    const gruposPorDia = {};
    historicoVendasCache.forEach(v => {
        total15Dias += v.valor_total;
        const dataVenda = new Date(v.created_at);
        const diaKey = dataVenda.toISOString().split('T')[0];

        if (dataVenda.toDateString() === hojeStr) {
            totalHoje += v.valor_total;
        }
        if ((new Date() - dataVenda) / (1000 * 60 * 60 * 24) <= 7) {
            totalSemanal += v.valor_total;
        }

        if (!gruposPorDia[diaKey]) {
            gruposPorDia[diaKey] = {
                dataStr: dataVenda.toLocaleDateString('pt-BR'),
                totalDia: 0,
                vendas: []
            };
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
                </div>
            `;
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
            </div>
        `;
    });

    container.innerHTML = htmlJanelas;
}

// Expondo funções administrativas para o escopo global (para o HTML / onclick funcionar)
window.mudarAbaAdmin = mudarAbaAdmin;
window.recarregarDadosAdmin = recarregarDadosAdmin;
window.abrirPainelAdmin = abrirPainelAdmin;
window.fecharPainelAdmin = fecharPainelAdmin;
window.filtrarTabelaAdmin = filtrarTabelaAdmin;
window.abrirModalNovoProdutoAdmin = abrirModalNovoProdutoAdmin;
window.abrirEditarProdutoAdmin = abrirEditarProdutoAdmin;
window.fecharFormProduto = fecharFormProduto;
window.salvarProdutoAdmin = salvarProdutoAdmin;
window.excluirProdutoAdmin = excluirProdutoAdmin;
window.excluirOperadorLoja = excluirOperadorLoja;
window.abrirModalNovoOperador = abrirModalNovoOperador;
window.fecharModalNovoOperador = fecharModalNovoOperador;
window.salvarNovoOperador = salvarNovoOperador;