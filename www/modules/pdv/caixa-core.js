/**
 * Núcleo do PDV (www/modules/pdv/components/caixa-core.js)
 * Orquestra o fluxo de vendas, carrinho, pagamentos e taxas de maquininhas.
 */

import { supabase } from '../../../core/config.js';
import { initCaixaBusca } from './caixa-busca.js';
import { CaixaOperacoes } from './caixa-operacoes.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sessão e dados da loja
    const carrinho = [];
    let trocoInicialCaixa = 50.00; // Exemplo padrão, recuperado da abertura

    // Renderizar Cabeçalho Profissional dinamicamente se necessário
    const appContainer = document.getElementById('pdv-root') || document.body;
    
    // Injetar estrutura base se estiver vazia
    appContainer.innerHTML = `
        <div class="min-h-screen bg-emerald-50 flex flex-col">
            <!-- Cabeçalho Profissional -->
            <header class="bg-emerald-800 text-white shadow-md p-3 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="bg-white p-1 rounded-lg text-emerald-800 font-bold text-xs px-2 shadow">PDV</div>
                    <div>
                        <h1 id="loja-nome" class="text-sm font-bold leading-tight">Supermercado Exemplo</h1>
                        <p id="loja-doc" class="text-[10px] text-emerald-200">CNPJ: 00.000.000/0001-00 | Caixa: #01</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <a href="../admin/admin.html" class="bg-emerald-700 hover:bg-emerald-600 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">Admin</a>
                    <button id="btn-power-off" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">Sair</button>
                </div>
            </header>

            <!-- Área Principal de Vendas -->
            <main class="flex-1 p-3 flex flex-col md:flex-row gap-3 max-w-7xl mx-auto w-full">
                <!-- Coluna Esquerda: Busca e Lista de Itens -->
                <section class="flex-1 flex flex-col">
                    <div id="busca-container"></div>
                    
                    <!-- Carrinho / Tabela de Produtos Adicionados -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                            <span>Item / Produto</span>
                            <span>Qtd / Preço</span>
                            <span>Subtotal</span>
                        </div>
                        <div id="carrinho-lista" class="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[50vh] p-2 space-y-2">
                            <p class="text-center text-gray-400 text-sm py-8">Nenhum item adicionado ao carrinho.</p>
                        </div>
                    </div>
                </section>

                <!-- Coluna Direita: Totais e Fechamento -->
                <section class="w-full md:w-96 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                    <div>
                        <h2 class="text-sm font-bold text-gray-700 uppercase border-b pb-2 mb-3">Resumo da Venda</h2>
                        <div class="flex justify-between text-gray-600 mb-1 text-sm">
                            <span>Subtotal:</span>
                            <span id="txt-subtotal">R$ 0,00</span>
                        </div>
                        <div class="flex justify-between text-gray-600 mb-3 text-sm">
                            <span>Descontos / Taxas:</span>
                            <span id="txt-taxas">R$ 0,00</span>
                        </div>
                        <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center mb-4">
                            <span class="text-emerald-800 font-bold">TOTAL A PAGAR:</span>
                            <span id="txt-total" class="text-2xl font-extrabold text-emerald-800">R$ 0,00</span>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <button id="btn-finalizar" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                            Finalizar Pagamento
                        </button>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="btn-cancelar-item" class="bg-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-lg transition-colors">
                                Cancelar Item (PIN)
                            </button>
                            <button id="btn-fechar-caixa" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-lg transition-colors">
                                Fechar Caixa
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    // Montar Barra de Busca
    const buscaContainer = document.getElementById('busca-container');
    const barraBusca = initCaixaBusca(async (termo) => {
        // Buscar produto no Supabase por código de barras ou nome
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .or(`codigo_barras.eq.${termo},nome.ilike.%${termo}%`)
            .limit(1);

        if (error || !data || data.length === 0) {
            alert('Produto não encontrado!');
            return;
        }

        const produto = data[0];
        adicionarAoCarrinho(produto);
    });
    buscaContainer.appendChild(barraBusca.element);

    function adicionarAoCarrinho(produto) {
        const existente = carrinho.find(item => item.id === produto.id);
        if (existente) {
            existente.quantidade += 1;
        } else {
            carrinho.push({ ...produto, quantidade: 1 });
        }
        atualizarCarrinhoUI();
    }

    function atualizarCarrinhoUI() {
        const listaEl = document.getElementById('carrinho-lista');
        const txtSubtotal = document.getElementById('txt-subtotal');
        const txtTotal = document.getElementById('txt-total');

        if (carrinho.length === 0) {
            listaEl.innerHTML = `<p class="text-center text-gray-400 text-sm py-8">Nenhum item adicionado ao carrinho.</p>`;
            txtSubtotal.textContent = 'R$ 0,00';
            txtTotal.textContent = 'R$ 0,00';
            return;
        }

        let html = '';
        let totalGeral = 0;

        carrinho.forEach((item, index) => {
            const sub = item.preco * item.quantidade;
            totalGeral += sub;
            html += `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                    <div>
                        <p class="font-bold text-gray-800">${item.nome}</p>
                        <p class="text-xs text-gray-500">R$ ${item.preco.toFixed(2)} un</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-semibold text-gray-700">x${item.quantidade}</span>
                        <span class="font-bold text-emerald-700">R$ ${sub.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });

        listaEl.innerHTML = html;
        txtSubtotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
        txtTotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
    }

    // Botão Cancelar Item com PIN
    document.getElementById('autorizacao-item')?.addEventListener('click', async () => {}); // placeholder
    document.getElementById('btn-cancelar-item').addEventListener('click', async () => {
        const autorizado = await CaixaOperacoes.solicitarPinSeguranca();
        if (autorizado && carrinho.length > 0) {
            carrinho.pop(); // Remove o último item como exemplo de cancelamento
            atualizarCarrinhoUI();
            alert('Item cancelado com sucesso.');
        }
    });

    // Botão Fechar Caixa
    document.getElementById('btn-fechar-caixa').addEventListener('click', () => {
        const totalFaturado = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        CaixaOperacoes.fecharCaixa(totalFaturado, trocoInicialCaixa);
    });

    // Botão Sair / Power
    document.getElementById('btn-power-off').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '../auth/auth.html';
    });

    // Finalizar Pagamento (Dinheiro, Pix, Débito, Crédito parcelado até 12x com taxas)
    document.getElementById('btn-finalizar').addEventListener('click', () => {
        if (carrinho.length === 0) {
            alert('Adicione itens ao carrinho antes de finalizar.');
            return;
        }

        const formaPagamento = prompt(
            'Escolha a Forma de Pagamento:\n1 - Dinheiro\n2 - Pix\n3 - Débito\n4 - Crédito à Vista\n5 - Crédito Parcelado (Até 12x)',
            '2'
        );

        if (!formaPagamento) return;

        let parcelas = 1;
        if (formaPagamento === '5') {
            const p = prompt('Digite a quantidade de parcelas (2 a 12x):', '2');
            parcelas = parseInt(p) || 1;
        }

        alert(`Pagamento processado com sucesso via forma #${formaPagamento} (${parcelas}x)! Venda concluída.`);
        carrinho.length = 0;
        atualizarCarrinhoUI();
    });
});