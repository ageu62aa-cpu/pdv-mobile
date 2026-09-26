export function renderModalAdmin() {
  return `
    <div id="modalAdmin" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
        <div class="bg-white rounded-2xl max-w-5xl w-full p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center border-b pb-3 mb-3">
                <div class="flex items-center space-x-3">
                    <h3 class="font-bold text-lg text-slate-900"><i class="fa-solid fa-user-shield text-emerald-600 mr-2"></i> Painel Administrativo do Estabelecimento</h3>
                    <button onclick="recarregarDadosAdmin()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1" title="Atualizar dados do painel"><i class="fa-solid fa-rotate text-emerald-600"></i><span>Refresh</span></button>
                </div>
                <button onclick="fecharPainelAdmin()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <div class="flex space-x-2 border-b pb-3 mb-3 overflow-x-auto">
                <button id="btnAbaProdutos" onclick="mudarAbaAdmin('produtos')" class="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg">Produtos (Máx 800)</button>
                <button id="btnAbaOperadores" onclick="mudarAbaAdmin('operadores')" class="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Operadores & Status</button>
                <button id="btnAbaMaquininhas" onclick="mudarAbaAdmin('maquininhas')" class="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Maquininhas & Taxas</button>
                <button id="btnAbaHistorico" onclick="mudarAbaAdmin('historico')" class="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Faturamento & Histórico</button>
                <button id="btnAbaConfiguracoes" onclick="mudarAbaAdmin('configuracoes')" class="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Configurações & PIN</button>
            </div>
            
            <div id="conteudoAbaProdutos" class="flex-1 flex flex-col overflow-hidden">
                <div class="flex justify-between mb-3 gap-2 items-center">
                    <input type="text" oninput="filtrarTabelaAdmin(this.value)" placeholder="Buscar produto..." class="border rounded px-3 py-1.5 text-sm flex-1">
                    <span id="contadorLimiteProdutosAdmin" class="text-xs font-bold text-slate-500">0 / 800 produtos</span>
                    <button onclick="abrirModalNovoProdutoAdmin()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow"><i class="fa-solid fa-plus mr-1"></i> Novo Produto</button>
                </div>
                <div class="overflow-y-auto flex-1 border rounded-lg">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-50 border-b text-xs text-slate-600 sticky top-0">
                            <tr>
                                <th class="p-2">Cód</th>
                                <th class="p-2">Nome</th>
                                <th class="p-2">Preço</th>
                                <th class="p-2">Estoque / Tipo</th>
                                <th class="p-2 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaAdminProdutos"></tbody>
                    </table>
                </div>
            </div>

            <div id="conteudoAbaOperadores" class="hidden flex-1 flex flex-col overflow-hidden">
                <div class="flex justify-between mb-3 items-center">
                    <p class="text-xs text-slate-500">Gerencie o Administrador e os operadores.</p>
                    <button onclick="abrirModalNovoOperador()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow"><i class="fa-solid fa-user-plus mr-1"></i> Adicionar Operador</button>
                </div>
                <div class="overflow-y-auto flex-1 border rounded-lg">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-50 border-b text-xs text-slate-600">
                            <tr>
                                <th class="p-3">Usuário / Responsável</th>
                                <th class="p-3">Cargo</th>
                                <th class="p-3 text-center">Status Individual do Caixa</th>
                                <th class="p-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaOperadoresLoja"></tbody>
                    </table>
                </div>
            </div>

            <div id="conteudoAbaMaquininhas" class="hidden flex-1 flex flex-col overflow-hidden space-y-3">
                <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                    <div>
                        <h4 class="font-bold text-xs text-slate-800 uppercase">Cadastro de Maquininhas de Cartão</h4>
                        <p class="text-[11px] text-slate-500">Cadastre as operadoras e configure as taxas de débito, crédito e parcelamento.</p>
                    </div>
                    <button onclick="abrirModalNovaMaquininha()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow flex items-center space-x-1.5">
                        <i class="fa-solid fa-plus"></i><span>Nova Maquininha</span>
                    </button>
                </div>
                <div class="overflow-y-auto flex-1 border rounded-lg">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-50 border-b text-xs text-slate-600">
                            <tr>
                                <th class="p-3">Maquininha / Operadora</th>
                                <th class="p-3">Taxas Base (Débito / À Vista)</th>
                                <th class="p-3">Parcelamento</th>
                                <th class="p-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaMaquininhasAdmin">
                            <tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma maquininha cadastrada.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="conteudoAbaHistorico" class="hidden flex-1 flex flex-col overflow-hidden space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                        <span class="text-[11px] text-emerald-800 font-bold block">FATURAMENTO DIÁRIO</span>
                        <strong id="adminFatHoje" class="text-lg font-black text-emerald-700">R$ 0,00</strong>
                    </div>
                    <div class="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                        <span class="text-[11px] text-blue-800 font-bold block">FATURAMENTO SEMANAL</span>
                        <strong id="adminFatSemanal" class="text-lg font-black text-blue-700">R$ 0,00</strong>
                    </div>
                    <div class="bg-slate-100 border p-3 rounded-xl">
                        <span class="text-[11px] text-slate-700 font-bold block">TOTAL (15 DIAS RETENÇÃO)</span>
                        <strong id="adminFatTotal15Dias" class="text-lg font-black text-slate-800">R$ 0,00</strong>
                    </div>
                </div>
                <div class="overflow-y-auto flex-1 border rounded-lg divide-y" id="containerJanelasFaturamentoDiario">
                    <div class="p-6 text-center text-slate-400">Carregando faturamento dos últimos 15 dias...</div>
                </div>
            </div>

            <div id="conteudoAbaConfiguracoes" class="hidden flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                <h3 class="font-bold text-sm text-slate-800 border-b pb-2"><i class="fa-solid fa-key text-emerald-600 mr-1"></i> Configurações do Estabelecimento</h3>
                <div class="max-w-md space-y-3 bg-slate-50 p-4 rounded-xl border">
                    <h4 class="font-bold text-xs text-slate-700 uppercase">Alterar Dados do Estabelecimento</h4>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Nome do Estabelecimento</label>
                        <input type="text" id="inputAdminNomeEmpresaConfig" class="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="Nome da Loja">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">WhatsApp da Empresa</label>
                        <input type="text" id="inputAdminWhatsappConfig" class="w-full p-2.5 border rounded-lg text-sm bg-white" placeholder="(92) 99999-9999">
                    </div>
                    <button onclick="salvarConfiguracoesEmpresaAdmin()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Salvar Dados da Loja</button>
                </div>
                <div class="max-w-md space-y-3 pt-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">PIN Gerencial de Autorização (Cancelamento de Itens)</label>
                        <input type="password" id="inputAdminPinConfig" maxlength="6" class="w-full p-2.5 border rounded-lg text-sm font-bold tracking-widest text-slate-800" placeholder="Ex: 123456">
                    </div>
                    <button onclick="salvarPinAdmin()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow">Salvar PIN</button>
                </div>
            </div>
        </div>
    </div>
  `;
}