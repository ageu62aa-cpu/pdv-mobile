export function renderModalCheckout() {
  return `
    <div id="modalFinalizarVenda" class="hidden fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp space-y-4">
            <div class="flex justify-between items-center border-b pb-3">
                <h3 class="font-bold text-lg text-slate-900"><i class="fa-solid fa-cash-register text-emerald-600 mr-2"></i> Finalizar Venda</h3>
                <button onclick="fecharModalFinalizarVenda()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>

            <div class="bg-slate-50 p-3 rounded-xl border flex justify-between items-center">
                <span class="text-xs font-bold text-slate-600 uppercase">Valor Total dos Produtos:</span>
                <span id="modalValTotalOriginal" class="text-base font-bold text-slate-800">R$ 0,00</span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-600 mb-2">Forma de Pagamento</label>
                <div class="grid grid-cols-4 gap-2">
                    <button type="button" onclick="selecionarFormaPagamento('dinheiro')" id="btnFormaDinheiro" class="py-2.5 px-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition text-center">Dinheiro</button>
                    <button type="button" onclick="selecionarFormaPagamento('pix')" id="btnFormaPix" class="py-2.5 px-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition text-center">PIX</button>
                    <button type="button" onclick="selecionarFormaPagamento('debito')" id="btnFormaDebito" class="py-2.5 px-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition text-center">Débito</button>
                    <button type="button" onclick="selecionarFormaPagamento('credito')" id="btnFormaCredito" class="py-2.5 px-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition text-center">Crédito</button>
                </div>
            </div>

            <div id="secaoOpcoesCartao" class="hidden space-y-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Selecionar Maquininha</label>
                    <select id="selectMaquininhaVenda" onchange="recalcularTotalComTaxasMaquininha()" class="w-full p-2.5 border rounded-lg text-sm bg-white font-medium">
                        <option value="">Selecione uma maquininha cadastrada...</option>
                    </select>
                </div>
                <div id="divSeletorParcelas" class="hidden">
                    <label class="block text-xs font-bold text-slate-700 mb-1">Condição de Parcelamento</label>
                    <select id="selectParcelasVenda" onchange="recalcularTotalComTaxasMaquininha()" class="w-full p-2.5 border rounded-lg text-sm bg-white">
                        <option value="1">Crédito à Vista</option>
                        <option value="2">2x com Juros</option>
                        <option value="3">3x com Juros</option>
                        <option value="6">6x com Juros</option>
                        <option value="12">12x com Juros</option>
                    </select>
                </div>
                <div class="flex justify-between items-center text-xs pt-1 border-t border-blue-200">
                    <span class="text-blue-900 font-semibold">Taxa / Juros Aplicados:</span>
                    <span id="txtTaxaAplicadaInfo" class="font-bold text-blue-700">0.00% (R$ 0,00)</span>
                </div>
            </div>

            <div id="secaoDinheiroTroco" class="space-y-2">
                <label class="block text-xs font-bold text-slate-600">Valor Recebido em Dinheiro (R$)</label>
                <input type="number" step="0.01" id="inputValorRecebido" oninput="calcularTrocoCaixa()" placeholder="0.00" class="w-full p-3 border rounded-xl text-lg font-bold text-emerald-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-xs">
                    <span class="font-bold text-slate-600">Troco a Devolver:</span>
                    <strong id="txtTrocoDevolver" class="text-emerald-700 text-sm font-black font-mono">R$ 0,00</strong>
                </div>
            </div>

            <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                <span class="font-bold text-xs text-emerald-900 uppercase">Valor Final a Cobrar do Cliente:</span>
                <span id="modalValFinalComJuros" class="text-lg font-black text-emerald-700 font-mono">R$ 0,00</span>
            </div>

            <div class="flex space-x-2 pt-2">
                <button onclick="fecharModalFinalizarVenda()" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition">Cancelar</button>
                <button onclick="confirmarConclusaoVenda()" class="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs shadow-lg transition">Concluir Venda</button>
            </div>
        </div>
    </div>
  `;
}