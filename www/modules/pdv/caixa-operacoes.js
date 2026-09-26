/**
 * Componente: Caixa Operações (www/modules/pdv/components/caixa-operacoes.js)
 * Gerencia abertura, fechamento e cancelamentos seguros por PIN.
 */

import { supabase } from '../../../core/config.js';

export const CaixaOperacoes = {
    async abrirCaixa() {
        const trocoInicial = prompt('Digite o valor do troco inicial na gaveta (R$):', '0.00');
        if (trocoInicial === null) return false;

        const valor = parseFloat(trocoInicial.replace(',', '.'));
        if (isNaN(valor) || valor < 0) {
            alert('Valor inválido para o troco inicial.');
            return false;
        }

        // Salvar abertura no Supabase
        const { error } = await supabase.from('caixa_sessoes').insert([{
            tipo: 'ABERTURA',
            troco_inicial: valor,
            status: 'ABERTO',
            data_hora: new Date()
        }]);

        if (error) {
            alert('Erro ao registrar abertura de caixa: ' + error.message);
            return false;
        }

        alert(`Caixa aberto com sucesso! Troco inicial: R$ ${valor.toFixed(2)}`);
        return true;
    },

    async solicitarPinSeguranca() {
        const pinDigitado = prompt('Área Restrita: Digite o PIN de segurança do Administrador para autorizar o cancelamento:');
        if (!pinDigitado) return false;

        // Validar PIN no Supabase (tabela de configurações/admin)
        const { data, error } = await supabase
            .from('empresas_config')
            .select('admin_pin')
            .single();

        if (error || !data) {
            // Fallback padrão caso não configurado
            if (pinDigitado === '1234') return true;
            alert('PIN incorreto ou não configurado.');
            return false;
        }

        if (pinDigitado === data.admin_pin) {
            return true;
        } else {
            alert('PIN de segurança inválido!');
            return false;
        }
    },

    async fecharCaixa(totalFaturado, trocoInicial) {
        const confirmar = confirm(`Deseja realmente fechar o caixa?\nTotal Faturado nas Vendas: R$ ${totalFaturado.toFixed(2)}`);
        if (!confirmar) return;

        const balancoFinal = totalFaturado + trocoInicial;

        const { error } = await supabase.from('caixa_sessoes').insert([{
            tipo: 'FECHAMENTO',
            total_faturado: totalFaturado,
            troco_inicial: trocoInicial,
            balanco_final: balancoFinal,
            status: 'FECHADO',
            data_hora: new Date()
        }]);

        if (error) {
            alert('Erro ao registrar fechamento: ' + error.message);
            return;
        }

        alert(`Caixa fechado com sucesso!\nTotal Vendas: R$ ${totalFaturado.toFixed(2)}\nBalanço Final na Gaveta: R$ ${balancoFinal.toFixed(2)}`);
        window.location.reload();
    }
};