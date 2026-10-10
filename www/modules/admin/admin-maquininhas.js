/**
 * Módulo: Admin Maquininhas (www/modules/admin/admin-maquininhas.js)
 * Configuração de taxas para cálculo correto no PDV.
 */

import { supabase } from '../../core/config.js';

export async function initAdminMaquininhas(containerEl) {
    const empresaId = window.empresaAtualId;
    if (!empresaId) {
        throw new Error('Empresa não identificada para carregar as taxas das maquininhas.');
    }

    containerEl.innerHTML = `
    <div class="space-y-4 max-w-xl">
        <div>
            <h2 class="text-lg font-bold text-white">Taxas das Maquininhas de Cartão</h2>
            <p class="text-xs text-gray-400">Defina os percentuais cobrados para que o PDV calcule os repasses e juros reais.</p>
        </div>
        
        <form id="form-taxas" class="bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-700 space-y-4">
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Débito (%)</label>
                <input type="number" min="0" max="100" step="0.01" id="taxa-debito" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="1.99">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Crédito à Vista (%)</label>
                <input type="number" min="0" max="100" step="0.01" id="taxa-credito-vista" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="3.49">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Crédito Parcelado (Média ao mês / até 12x) (%)</label>
                <input type="number" min="0" max="100" step="0.01" id="taxa-credito-parcelado" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="4.99">
            </div>
            <p id="status-taxas" class="hidden text-xs" role="status"></p>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow">
                Salvar Taxas
            </button>
        </form>
    </div>
    `;

    const form = containerEl.querySelector('#form-taxas');
    const status = containerEl.querySelector('#status-taxas');
    const campos = {
        debito: containerEl.querySelector('#taxa-debito'),
        creditoVista: containerEl.querySelector('#taxa-credito-vista'),
        creditoParcelado: containerEl.querySelector('#taxa-credito-parcelado')
    };

    const { data: configuracao, error: erroConsulta } = await supabase
        .from('empresas_config')
        .select('taxa_debito, taxa_credito_vista, taxa_credito_parcelado')
        .eq('empresa_id', empresaId)
        .maybeSingle();
    if (erroConsulta) {
        console.error('PDV-VS: Erro ao carregar taxas da empresa:', erroConsulta);
        status.textContent = `Não foi possível carregar as taxas: ${erroConsulta.message}`;
        status.className = 'text-xs text-rose-400';
        status.classList.remove('hidden');
    } else if (configuracao) {
        campos.debito.value = String(configuracao.taxa_debito);
        campos.creditoVista.value = String(configuracao.taxa_credito_vista);
        campos.creditoParcelado.value = String(configuracao.taxa_credito_parcelado);
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const taxas = {
            taxa_debito: Number(campos.debito.value),
            taxa_credito_vista: Number(campos.creditoVista.value),
            taxa_credito_parcelado: Number(campos.creditoParcelado.value)
        };
        if (Object.values(taxas).some(taxa => !Number.isFinite(taxa) || taxa < 0 || taxa > 100)) {
            status.textContent = 'Informe percentuais entre 0 e 100.';
            status.className = 'text-xs text-rose-400';
            status.classList.remove('hidden');
            return;
        }

        const botao = form.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
            const { error } = await supabase.from('empresas_config').upsert({
                empresa_id: empresaId,
                ...taxas
            }, { onConflict: 'empresa_id' });
            if (error) throw error;
            status.textContent = 'Taxas atualizadas com sucesso.';
            status.className = 'text-xs text-emerald-400';
            status.classList.remove('hidden');
        } catch (error) {
            console.error('PDV-VS: Erro ao salvar taxas da empresa:', error);
            status.textContent = `Erro ao salvar taxas: ${error.message}`;
            status.className = 'text-xs text-rose-400';
            status.classList.remove('hidden');
        } finally {
            botao.disabled = false;
        }
    });
}