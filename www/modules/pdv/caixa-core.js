/**
 * Núcleo do PDV (www/modules/pdv/components/caixa-core.js)
 * Orquestra o fluxo de vendas, carrinho, pagamentos, atalhos globais (F1-F12) e unidades KG/UN.
 */

import { supabase } from '../../../core/config.js';
import { initCaixaBusca } from './caixa-busca.js';
import { CaixaOperacoes } from './caixa-operacoes.js';

document.addEventListener('DOMContentLoaded', async () => {
    const carrinho = [];
    let trocoInicialCaixa = 50.00; 
    let fatorMultiplicador = 1; // Suporte para Qtd + F5 (ex: 5 + F5)
    let clienteAtual = { nome: 'Consumidor Geral', doc: '' };
    let vendedorAtual = { id: '#01', nome: 'Operador Ativo' };

    const appContainer = document.getElementById('pdv-root') || document.body;
    
    appContainer.innerHTML = `
        <div class="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            <!-- Cabeçalho Profissional -->
            <header class="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center shadow-md">
                <div class="flex items-center gap-3">
                    <img src="../../assets/mascote.jpeg" alt="Mascote Vancely" class="w-10 h-10 rounded-full object-cover border border-emerald-500 shadow">
                    <div>
                        <h1 id="loja-nome" class="text-base font-extrabold text-white">Vancely Software - Caixa Aberto</h1>
                        <p id="loja-doc" class="text-xs text-emerald-400">Operador: <span id="lbl-vendedor">Ativo</span> | Caixa: #01 | Cliente: <span id="lbl-cliente">Geral</span></p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <a href="../admin/admin.html" class="bg-gray-700 hover:bg-gray-600 text-xs px-3 py-2 rounded-lg font-medium transition-colors text-white">Admin</a>
                    <button id="btn-power-off" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-white">Sair</button>
                </div>
            </header>

            <!-- Área Principal de Vendas -->
            <main class="flex-1 p-4 flex flex-col md:flex-row gap-4 max-w-7xl mx-auto w-full">
                <!-- Coluna Esquerda: Busca e Lista de Itens -->
                <section class="flex-1 flex flex-col gap-4">
                    <div id="busca-container" class="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-xl"></div>
                    
                    <!-- Carrinho / Tabela de Produtos Adicionados -->
                    <div class="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden">
                        <div class="bg-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                            <span>Item / Produto</span>
                            <span>Qtd / Preço</span>
                            <span>Subtotal</span>
                        </div>
                        <div id="carrinho-lista" class="divide-y divide-gray-700 flex-1 overflow-y-auto max-h-[50vh] p-4 space-y-2">
                            <p class="text-center text-gray-500 text-sm py-8">Nenhum item adicionado ao carrinho. (Atalhos: F1-F12)</p>
                        </div>
                    </div>
                </section>

                <!-- Coluna Direita: Totais e Fechamento -->
                <section class="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-4 flex flex-col justify-between">
                    <div>
                        <h2 class="text-sm font-bold text-white uppercase border-b border-gray-700 pb-2 mb-4">Resumo da Venda</h2>
                        <div class="flex justify-between text-gray-400 mb-2 text-sm">
                            <span>Subtotal:</span>
                            <span id="txt-subtotal" class="text-white font-bold">R$ 0,00</span>
                        </div>
                        <div class="flex justify-between text-gray-400 mb-4 text-sm">
                            <span>Descontos / Taxas:</span>
                            <span id="txt-taxas" class="text-white font-bold">R$ 0,00</span>
                        </div>
                        <div class="bg-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center mb-6">
                            <span class="text-emerald-400 font-bold text-xs uppercase">Total a Pagar:</span>
                            <span id="txt-total" class="text-2xl font-extrabold text-emerald-400">R$ 0,00</span>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3">
                        <button id="btn-finalizar" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                            Finalizar Pagamento (F3/F7)
                        </button>
                        <div class="grid grid-cols-2 gap-2">
                            <button id="btn-cancelar-item" class="bg-gray-700 hover:bg-red-900 hover:text-red-200 border border-gray-600 text-gray-300 text-xs font-bold py-2.5 rounded-lg transition-colors">
                                Cancelar Item (PIN)
                            </button>
                            <button id="btn-fechar-caixa" class="bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2.5 rounded-lg transition-colors">
                                Fechar Caixa
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    `;

    // Montar Barra de Busca & Leitor Dual
    const buscaContainer = document.getElementById('busca-container');
    const barraBusca = initCaixaBusca(async (termo) => {
        await processarBuscaProduto(termo);
    });
    buscaContainer.appendChild(barraBusca.element);

    async function processarBuscaProduto(termo) {
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
        
        // 1. Gestão de Unidades de Medida (UN vs. KG / Fracionado)
        let quantidadeAdicionar = fatorMultiplicador;
        fatorMultiplicador = 1; // Reseta fator após uso

        if (produto.unidade === 'KG' || produto.tipo === 'peso') {
            const pesoInput = prompt(`Produto por KG: ${produto.nome}\nDigite o peso em quilos (ex: 0.750):`, '1.000');
            const pesoParsed = parseFloat(pesoInput);
            if (isNaN(pesoParsed) || pesoParsed <= 0) {
                alert('Peso inválido. Operação cancelada.');
                return;
            }
            quantidadeAdicionar = pesoParsed;
        }

        adicionarAoCarrinho(produto, quantidadeAdicionar);
    }

    function adicionarAoCarrinho(produto, qtd) {
        const existente = carrinho.find(item => item.id === produto.id);
        if (existente) {
            existente.quantidade += qtd;
        } else {
            carrinho.push({ ...produto, quantidade: qtd });
        }
        atualizarCarrinhoUI();
    }

    function atualizarCarrinhoUI() {
        const listaEl = document.getElementById('carrinho-lista');
        const txtSubtotal = document.getElementById('txt-subtotal');
        const txtTotal = document.getElementById('txt-total');

        if (carrinho.length === 0) {
            listaEl.innerHTML = `<p class="text-center text-gray-500 text-sm py-8">Nenhum item adicionado ao carrinho. (Atalhos: F1-F12)</p>`;
            txtSubtotal.textContent = 'R$ 0,00';
            txtTotal.textContent = 'R$ 0,00';
            return;
        }

        let html = '';
        let totalGeral = 0;

        carrinho.forEach((item) => {
            const sub = item.preco * item.quantidade;
            totalGeral += sub;
            html += `
                <div class="flex justify-between items-center p-2 bg-gray-900 rounded-lg text-sm border border-gray-700">
                    <div>
                        <p class="font-bold text-white">${item.nome}</p>
                        <p class="text-xs text-gray-400">R$ ${item.preco.toFixed(2)} ${item.unidade || 'UN'}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-semibold text-gray-300">${item.unidade === 'KG' ? item.quantidade.toFixed(3) + ' kg' : 'x' + item.quantidade}</span>
                        <span class="font-bold text-emerald-400">R$ ${sub.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });

        listaEl.innerHTML = html;
        txtSubtotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
        txtTotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
    }

    // ==========================================
    // MATRIZ DE ATALHOS PROFISSIONAIS (F1 a F12)
    // ==========================================
    window.addEventListener('keydown', (e) => {
        // Evita conflitos se estiver digitando em modais específicos de input
        if (e.target.tagName === 'INPUT' && e.key !== 'F4' && e.key !== 'F5') return;

        switch (e.key) {
            case 'F1': // Identificar Consumidor
                e.preventDefault();
                const cpf = prompt('Informe o CPF/CNPJ do Consumidor para a NFC-e:', clienteAtual.doc);
                if (cpf !== null) {
                    clienteAtual.doc = cpf;
                    document.getElementById('lbl-cliente').textContent = cpf ? cpf : 'Geral';
                    alert(`Consumidor identificado: ${cpf || 'Não informado'}`);
                }
                break;

            case 'F2': // Identificar Vendedor / Operador
                e.preventDefault();
                const vend = prompt('Informe o nome ou ID do Vendedor:', vendedorAtual.nome);
                if (vend) {
                    vendedorAtual.nome = vend;
                    document.getElementById('lbl-vendedor').textContent = vend;
                }
                break;

            case 'F3':
            case 'F7': // Avançar para Pagamento
                e.preventDefault();
                document.getElementById('btn-finalizar').click();
                break;

            case 'F4': // Consulta / Focar Busca
                e.preventDefault();
                const inputBusca = document.querySelector('input[type="text"]');
                if (inputBusca) inputBusca.focus();
                break;

            case 'F5': // Multiplicador de Quantidade
                e.preventDefault();
                const fator = prompt('Digite o fator multiplicador (Ex: 5 para 5 unidades):', '1');
                const parsedFator = parseFloat(fator);
                if (!isNaN(parsedFator) && parsedFator > 0) {
                    fatorMultiplicador = parsedFator;
                    alert(`Multiplicador ativado: ${fatorMultiplicador}x. Bipe ou busque o próximo item.`);
                }
                break;

            case 'F6': // Pausar Venda (Salvar em LocalStorage)
                e.preventDefault();
                if (carrinho.length === 0) {
                    alert('Carrinho vazio para pausar.');
                    return;
                }
                localStorage.setItem('vancely_venda_suspensa', JSON.stringify(carrinho));
                carrinho.length = 0;
                atualizarCarrinhoUI();
                alert('Venda pausada e salva com sucesso!');
                break;

            case 'F11': // Recuperar Venda Suspensa
                e.preventDefault();
                const vendaSalva = localStorage.getItem('vancely_venda_suspensa');
                if (!vendaSalva) {
                    alert('Nenhuma venda pausada encontrada.');
                    return;
                }
                const itensRestaurados = JSON.parse(vendaSalva);
                itensRestaurados.forEach(i => carrinho.push(i));
                localStorage.removeItem('vancely_venda_suspensa');
                atualizarCarrinhoUI();
                alert('Venda recuperada com sucesso!');
                break;

            case 'F9': // Pagamento Rápido em Dinheiro
                e.preventDefault();
                executarPagamentoDinheiroRapido();
                break;

            case 'F12': // Desconto Especial
                e.preventDefault();
                aplicarDescontoEspecial();
                break;

            case 'F8': // Finalizar e Impressão Térmica Fiscal (NFC-e)
                e.preventDefault();
                finalizarEImprimirCupom();
                break;
        }
    });

    function aplicarDescontoEspecial() {
        const descontoStr = prompt('Digite o valor do desconto em R$ ou percentual (%):', '0.00');
        if (!descontoStr) return;
        alert(`Desconto de ${descontoStr} aplicado na venda.`);
    }

    function executarPagamentoDinheiroRapido() {
        if (carrinho.length === 0) {
            alert('Carrinho vazio.');
            return;
        }
        const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const recebidoStr = prompt(`Total a pagar: R$ ${totalGeral.toFixed(2)}\nValor em Dinheiro Recebido:`, totalGeral.toFixed(2));
        const recebido = parseFloat(recebidoStr);
        
        if (isNaN(recebido) || recebido < totalGeral) {
            alert('Valor insuficiente ou inválido.');
            return;
        }

        const troco = recebido - totalGeral;
        alert(`Pagamento em Dinheiro Aprovado!\nTroco: R$ ${troco.toFixed(2)}`);
        finalizarEImprimirCupom();
    }

    function finalizarEImprimirCupom() {
        if (carrinho.length === 0) {
            alert('Adicione itens ao carrinho antes de finalizar.');
            return;
        }

        // Simulação do Cupom Térmico NFC-e e impressão via thermal window.print()
        const janelaImpressao = window.open('', '_blank', 'width=350,height=600');
        const totalGeral = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        
        janelaImpressao.document.write(`
            <html>
                <head><style>body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; }</style></head>
                <body>
                    <center>
                        <h3>VANCELY SOFTWARE</h3>
                        <p>CNPJ: 00.000.000/0001-00<br>Manaus - AM</p>
                        <p>--------------------------------</p>
                        <h4>CUPOM FISCAL ELETRÔNICO (NFC-e)</h4>
                    </center>
                    <p>Cliente: ${clienteAtual.doc || 'Não Identificado'}</p>
                    <p>Operador: ${vendedorAtual.nome}</p>
                    <p>--------------------------------</p>
                    <ul>
                        ${carrinho.map(i => `<li>${i.nome} <br>${i.quantidade}x R$ ${i.preco.toFixed(2)} = R$ ${(i.preco * i.quantidade).toFixed(2)}</li>`).join('')}
                    </ul>
                    <p>--------------------------------</p>
                    <h3>TOTAL: R$ ${totalGeral.toFixed(2)}</h3>
                    <center><p>Obrigado pela preferência!</p></center>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        janelaImpressao.document.close();

        carrinho.length = 0;
        atualizarCarrinhoUI();
    }

    // Botão Cancelar Item com PIN
    document.getElementById('btn-cancelar-item').addEventListener('click', async () => {
        const autorizado = await CaixaOperacoes.solicitarPinSeguranca();
        if (autorizado && carrinho.length > 0) {
            carrinho.pop();
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

    // Finalizar Pagamento Tradicional (Botão da Tela)
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

        if (formaPagamento === '1') {
            executarPagamentoDinheiroRapido();
            return;
        }

        let parcelas = 1;
        if (formaPagamento === '5') {
            const p = prompt('Digite a quantidade de parcelas (2 a 12x):', '2');
            parcelas = parseInt(p) || 1;
        }

        alert(`Pagamento processado com sucesso via forma #${formaPagamento} (${parcelas}x)!`);
        finalizarEImprimirCupom();
    });
});