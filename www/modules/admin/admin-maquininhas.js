/**
 * Módulo: Admin Maquininhas (www/modules/admin/admin-maquininhas.js)
 * Configuração de taxas para cálculo correto no PDV.
 */

import { supabase } from '../../core/config.js';

export async function initAdminMaquininhas(containerEl) {
    containerEl.innerHTML = `
    <div class="space-y-4 max-w-xl">
        <div>
            <h2 class="text-lg font-bold text-white">Taxas das Maquininhas de Cartão</h2>
            <p class="text-xs text-gray-400">Defina os percentuais cobrados para que o PDV calcule os repasses e juros reais.</p>
        </div>
        
        <form id="form-taxas" class="bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-700 space-y-4">
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Débito (%)</label>
                <input type="number" step="0.01" id="taxa-debito" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="1.99">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Crédito à Vista (%)</label>
                <input type="number" step="0.01" id="taxa-credito-vista" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="3.49">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-300">Taxa Crédito Parcelado (Média ao mês / até 12x) (%)</label>
                <input type="number" step="0.01" id="taxa-credito-parcelado" class="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="4.99">
            </div>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow">
                Salvar Taxas
            </button>
        </form>
    </div>
    `;

    const form = containerEl.querySelector('#form-taxas');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const debito = document.getElementById('taxa-debito').value;
        const creditoVista = document.getElementById('taxa-credito-vista').value;
        const creditoParcelado = document.getElementById('taxa-credito-parcelado').value;

        const { error } = await supabase.from('empresas_config').upsert([{
            id: 1,
            taxa_debito: parseFloat(debito),
            taxa_credito_vista: parseFloat(creditoVista),
            taxa_credito_parcelado: parseFloat(creditoParcelado)
        }]);

        if (error) alert('Erro ao salvar taxas: ' + error.message);
        else alert('Taxas de maquininha atualizadas com sucesso!');
    });
}