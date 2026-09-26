/**
 * Módulo: Admin Maquininhas (www/modules/admin/admin-maquininhas.js)
 * Configuração de taxas para cálculo correto no PDV.
 */

import { supabase } from '../../core/config.js';

export async function initAdminMaquininhas(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-4 max-w-xl">
            <h2 class="text-lg font-bold text-gray-800">Taxas das Maquininhas de Cartão</h2>
            <p class="text-xs text-gray-500">Defina os percentuais cobrados para que o PDV calcule os repasses e juros reais.</p>
            
            <form id="form-taxas" class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <div>
                    <label class="text-xs font-bold text-gray-600">Taxa Débito (%)</label>
                    <input type="number" step="0.01" id="taxa-debito" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value="1.99">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600">Taxa Crédito à Vista (%)</label>
                    <input type="number" step="0.01" id="taxa-credito-vista" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value="3.49">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-600">Taxa Crédito Parcelado (Média ao mês / até 12x) (%)</label>
                    <input type="number" step="0.01" id="taxa-credito-parcelado" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value="4.99">
                </div>
                <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
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