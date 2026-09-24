// ==========================================
// MÓDULO DE GESTÃO ADMINISTRATIVA DA LOJA (PDV-VS)
// ==========================================

import { 
    empresaAtualId, produtosCache, cargoUsuarioAtual, historicoVendasCache, 
    setHistoricoVendasCache, setProdutosCache, setEmpresaAtualId 
} from './state.js';
import { carregarProdutosCache } from './produtos.js';
import { focarBusca } from './caixa.js';

export async function mudarAbaAdmin(aba) {
    ['Produtos', 'Operadores', 'Maquininhas', 'Historico', 'Configuracoes'].forEach(a => {
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
    
    if (aba === 'produtos' || aba === 'Produtos') {
        await carregarProdutosCache();
        renderizarTabelaAdmin(produtosCache);
    }
    if (aba === 'operadores' || aba === 'Operadores') await carregarOperadoresLoja();
    if (aba === 'maquininhas' || aba === 'Maquininhas') await carregarMaquininhasAdmin();
    if (aba === 'historico' || aba === 'Historico') await carregarHistoricoAdmin();
    if (aba === 'configuracoes' || aba === 'Configuracoes') {
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
}

export async function recarregarDadosAdmin() {
    await carregarProdutosCache();
    renderizarTabelaAdmin(produtosCache);
    if (cargoUsuarioAtual === 'admin_mercado') {
        await carregarHistoricoAdmin();
        await carregarOperadoresLoja();
        await carregarMaquininhasAdmin();
    }
    alert('PDV-VS: Dados do painel administrativo atualizados com sucesso!');
}

export async function abrirPainelAdmin() { 
    const modalAdmin = document.getElementById('modalAdmin');
    if (modalAdmin) {
        modalAdmin.classList.add('flex');
        modalAdmin.classList.remove('hidden'); 
    }

    let idEmpresaAtual = empresaAtualId || localStorage.getItem('empresa_id') || localStorage.getItem('pdv_empresa_id');

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: vincData } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (vincData && vincData.empresa_id) {
                idEmpresaAtual = vincData.empresa_id;
            } else if (!idEmpresaAtual) {
                idEmpresaAtual = session.user.id;
            }
            setEmpresaAtualId(idEmpresaAtual);
            localStorage.setItem('empresa_id', idEmpresaAtual);
        }
    } catch (e) {
        console.error("Erro ao validar empresa na sessão ao abrir painel:", e);
    }

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
        console.error("Erro ao carregar dados do painel:", e);
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

export async function salvarConfiguracoesEmpresaAdmin() {
    const inputNome = document.getElementById('inputAdminNomeEmpresaConfig');
    const inputWap = document.getElementById('inputAdminWhatsappConfig');
    const novoNome = inputNome ? inputNome.value.trim() : '';
    const novoWap = inputWap ? inputWap.value.trim() : '';

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

export function renderizarTabelaAdmin(lista) {
    const tbody = document.getElementById('tabelaAdminProdutos');
    const contadorProdutos = document.getElementById('contadorLimiteProdutosAdmin');
    
    const limiteMaximo = 1000; // Padronizado em 1000 vagas
    const qtdAtual = produtosCache.length;
    const vagasDisponiveis = Math.max(0, limiteMaximo - qtdAtual);

    if (contadorProdutos) {
        contadorProdutos.innerText = `${qtdAtual} cadastrados | Restam ${vagasDisponiveis} vagas (Máx: ${limiteMaximo})`;
    }

    if (!tbody) return;
    
    let html = '';
    lista.forEach(p => {
        html += `<tr class="border-b hover:bg-slate-50 transition">
            <td class="p-2.5 text-xs text-slate-600 font-mono">${p.codigo || '-'}</td>
            <td class="p-2.5 font-medium text-slate-800">${p.nome} ${p.unidade === 'KG' ? '<span class="text-amber-600 text-[10px] font-bold">(KG)</span>' : ''}</td>
            <td class="p-2.5 text-slate-700">R$ ${Number(p.preco).toFixed(2)}${p.unidade === 'KG' ? '/kg' : ''}</td>
            <td class="p-2.5 text-slate-700">${p.estoque} ${p.unidade || 'UN'}</td>
            <td class="p-2.5 text-center space-x-2">
                <button title="Editar Produto" onclick="window.abrirEditarProdutoAdmin(${p.id},'${p.nome}','${p.codigo || ''}',${p.preco},${p.estoque}, '${p.unidade || 'UN'}')" class="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"><i class="fa-solid fa-pen-to-square text-xs"></i></button>
                <button title="Excluir Produto" onclick="window.excluirProdutoAdmin(${p.id})" class="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
}

export function filtrarTabelaAdmin(t) { 
    renderizarTabelaAdmin(produtosCache.filter(p => p.nome.toLowerCase().includes(t.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(t.toLowerCase())))); 
}

export function abrirModalNovoProdutoAdmin() {
    if (produtosCache.length >= 1000) {
        alert('PDV-VS - Aviso do Plano: Você atingiu o limite máximo de 1.000 produtos cadastrados.');
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
    let idEmpresaAtual = empresaAtualId || localStorage.getItem('empresa_id') || localStorage.getItem('pdv_empresa_id');

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session && session.user) {
            const { data: vincData } = await window.supabaseClient
                .from('usuarios_empresas')
                .select('empresa_id')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (vincData && vincData.empresa_id) {
                idEmpresaAtual = vincData.empresa_id;
            } else if (!idEmpresaAtual) {
                idEmpresaAtual = session.user.id;
            }
            setEmpresaAtualId(idEmpresaAtual);
            localStorage.setItem('empresa_id', idEmpresaAtual);
        }
    } catch (e) {
        console.error("Erro ao validar empresa na sessão:", e);
    }

    if (!idEmpresaAtual) {
        alert('PDV-VS Erro Crítico: ID da empresa não encontrado. Faça login novamente.');
        return;
    }

    const prodId = document.getElementById('formProdId');
    const nome = document.getElementById('formNome');
    const codigo = document.getElementById('formCodigo');
    const preco = document.getElementById('formPreco');
    const estoque = document.getElementById('formEstoque');
    const selectUnidade = document.getElementById('formUnidade');

    const id = prodId ? prodId.value : '';
    const unidadeProd = selectUnidade ? selectUnidade.value : 'UN';

    const p = { 
        empresa_id: idEmpresaAtual,
        nome: nome ? nome.value.trim() : '', 
        codigo: codigo ? codigo.value.trim() : '', 
        preco: preco ? parseFloat(preco.value) || 0 : 0, 
        estoque: estoque ? parseFloat(estoque.value) || 0 : 0,
        unidade: unidadeProd
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
            alert('PDV-VS: Limite máximo de 1.000 produtos atingido.');
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
// GESTÃO DE MAQUININHAS E TAXAS DE CARTÃO
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

export function abrirModalNovaMaquininha() {
    const modal = document.getElementById('modalNovaMaquininha');
    if (modal) modal.classList.remove('hidden');
}

export function fecharModalNovaMaquininha() {
    const modal = document.getElementById('modalNovaMaquininha');
    if (modal) modal.classList.add('hidden');
}

export async function salvarNovaMaquininha() {
    const nome = document.getElementById('maqNome')?.value.trim();
    const debito = parseFloat(document.getElementById('maqDebito')?.value) || 0;
    const creditoAvista = parseFloat(document.getElementById('maqCreditoAvista')?.value) || 0;
    const parcelas2x = parseFloat(document.getElementById('maq2x')?.value) || 0;
    const parcelas3x = parseFloat(document.getElementById('maq3x')?.value) || 0;
    const parcelas6x = parseFloat(document.getElementById('maq6x')?.value) || 0;
    const parcelas12x = parseFloat(document.getElementById('maq12x')?.value) || 0;

    if (!nome) { alert('Informe o nome da maquininha (Ex: Ton, Stone)'); return; }

    const taxasObj = { "2": parcelas2x, "3": parcelas3x, "6": parcelas6x, "12": parcelas12x };

    const { error } = await window.supabaseClient.from('maquininhas_taxas').insert([{
        empresa_id: empresaAtualId,
        nome_maquina: nome,
        taxa_debito: debito,
        taxa_credito_avista: creditoAvista,
        taxas_parcelamento: taxasObj
    }]);

    if (error) {
        alert('Erro ao salvar maquininha: ' + error.message);
        return;
    }

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

export async function carregarOperadoresLoja() {
    if (!empresaAtualId) return;

    const { data: operadores, error } = await window.supabaseClient
        .from('usuarios_empresas')
        .select('*')
        .eq('empresa_id', empresaAtualId);

    if (error) return;

    const { data: caixasAbertos } = await window.supabaseClient
        .from('caixas')
        .select('user_id, status, faturamento_dia')
        .eq('empresa_id', empresaAtualId)
        .eq('status', 'ABERTO');

    const mapaCaixas = {};
    if (caixasAbertos) {
        caixasAbertos.forEach(c => { mapaCaixas[c.user_id] = c; });
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
    
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
    if (error) { alert('PDV-VS: Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await window.supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        await carregarOperadoresLoja();
        alert('PDV-VS: Operador cadastrado com sucesso!');
    }
}

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

// Expondo todas as funções globalmente para os botões do HTML
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
window.carregarMaquininhasAdmin = carregarMaquininhasAdmin;
window.abrirModalNovaMaquininha = abrirModalNovaMaquininha;
window.fecharModalNovaMaquininha = fecharModalNovaMaquininha;
window.salvarNovaMaquininha = salvarNovaMaquininha;
window.excluirMaquininhaAdmin = excluirMaquininhaAdmin;
window.carregarOperadoresLoja = carregarOperadoresLoja;
window.excluirOperadorLoja = excluirOperadorLoja;
window.abrirModalNovoOperador = abrirModalNovoOperador;
window.fecharModalNovoOperador = fecharModalNovoOperador;
window.salvarNovoOperador = salvarNovoOperador;
window.carregarHistoricoAdmin = carregarHistoricoAdmin;
window.renderizarHistoricoVendasPorJanelasDiarias = renderizarHistoricoVendasPorJanelasDiarias;
window.salvarConfiguracoesEmpresaAdmin = salvarConfiguracoesEmpresaAdmin;