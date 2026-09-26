// ==========================================
// HISTÓRICO DE VENDAS E FATURAMENTO (PDV-VS)
// ==========================================

import { empresaAtualId, historicoVendasCache, setHistoricoVendasCache } from '../../core/state.js';

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

Object.assign(window, {
    carregarHistoricoAdmin,
    renderizarHistoricoVendasPorJanelasDiarias
});