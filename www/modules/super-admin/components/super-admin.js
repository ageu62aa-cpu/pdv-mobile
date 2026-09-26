/**
 * Módulo: Super Admin Core (www/modules/super-admin/super-admin.js)
 * Gestão mestre de clientes, assinaturas e tenants do software.
 */

import { supabase } from '../../core/config.js';
import { criarModalSuperAdmin } from './components/modalSuperadmin.js'; // Ajuste o caminho se necessário

document.addEventListener('DOMContentLoaded', async () => {
    await carregarPainelSuperAdmin();

    document.getElementById('btn-atualizar-tenants').addEventListener('click', carregarPainelSuperAdmin);
});

async function carregarPainelSuperAdmin() {
    const tbody = document.getElementById('tabela-tenants-corpo');
    const statTotal = document.getElementById('stat-total-empresas');
    const statPlanos = document.getElementById('stat-planos-ativos');

    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-gray-500">Buscando empresas no Supabase...</td></tr>`;

    const { data: empresas, error } = await supabase
        .from('empresas')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-red-400">Erro ao carregar empresas: ${error.message}</td></tr>`;
        return;
    }

    if (!empresas || empresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-gray-500">Nenhuma empresa cadastrada na plataforma ainda.</td></tr>`;
        statTotal.textContent = '0';
        statPlanos.textContent = '0';
        return;
    }

    statTotal.textContent = empresas.length;
    statPlanos.textContent = empresas.filter(e => e.plano === 'comum_enterprise').length;

    tbody.innerHTML = empresas.map(emp => {
        return `
            <tr class="hover:bg-gray-750 transition-colors">
                <td class="p-4 font-bold text-white">${emp.nome_empresa || 'Não informada'}</td>
                <td class="p-4 text-gray-300 text-xs">${emp.nome_responsavel || '--'}<br><span class="text-gray-500">${emp.email}</span></td>
                <td class="p-4 font-mono text-xs text-gray-300">${emp.cnpj || '--'}</td>
                <td class="p-4">
                    <span class="bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase">
                        ${emp.plano || 'Comum'}
                    </span>
                    <p class="text-[10px] text-gray-400 mt-1">Limite: ${emp.limite_produtos || 1000} prod | ${emp.limite_operadores || 1} op</p>
                </td>
                <td class="p-4 font-bold text-yellow-400">${emp.dias_restantes || 15} dias</td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="window.abrirModalGerenciar('${emp.id}', '${emp.nome_empresa}', ${emp.dias_restantes || 15})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5 rounded font-bold transition-colors">
                        Gerenciar Plano
                    </button>
                    <button onclick="window.removerEmpresa('${emp.id}')" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded font-bold transition-colors">
                        Excluir
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Abertura de Modal Modular para Gerenciar Plano
window.abrirModalGerenciar = function(id, nomeEmpresa, diasAtuais) {
    const conteudo = `
        <div class="space-y-4">
            <p class="text-sm text-gray-300">Gerenciando assinatura para: <strong class="text-white">${nomeEmpresa}</strong></p>
            <div>
                <label class="text-xs font-bold text-gray-400 uppercase">Adicionar Dias ao Plano</label>
                <input type="number" id="input-dias-adicionais" class="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value="15">
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" id="modal-save-btn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                    Salvar Alteração
                </button>
            </div>
        </div>
    `;

    criarModalSuperAdmin(`Gerenciar Cliente - ${nomeEmpresa}`, conteudo, async (modalEl) => {
        const inputDias = modalEl.querySelector('#input-dias-adicionais');
        const adicional = parseInt(inputDias.value, 10);
        if (isNaN(adicional)) {
            alert('Digite um valor válido.');
            return false;
        }

        const novosDias = diasAtuais + adicional;
        const { error } = await supabase
            .from('empresas')
            .update({ dias_restantes: novosDias })
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar plano: ' + error.message);
            return false;
        }

        alert(`Plano atualizado com sucesso! Novo saldo: ${novosDias} dias.`);
        await carregarPainelSuperAdmin();
        return true;
    });
};

window.removerEmpresa = async function(id) {
    if (!confirm('ATENÇÃO: Deseja realmente excluir permanentemente esta empresa e seus acessos do sistema?')) return;

    const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao excluir empresa: ' + error.message);
    } else {
        alert('Empresa removida com sucesso da base de dados.');
        carregarPainelSuperAdmin();
    }
};