// ==========================================
// GESTÃO DE MAQUININHAS E TAXAS (PDV-VS)
// ==========================================

import { empresaAtualId } from '../../core/state.js';

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

Object.assign(window, {
    carregarMaquininhasAdmin,
    abrirModalNovaMaquininha,
    fecharModalNovaMaquininha,
    salvarNovaMaquininha,
    excluirMaquininhaAdmin
});