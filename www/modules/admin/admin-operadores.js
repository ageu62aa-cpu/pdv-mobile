// ==========================================
// GESTÃO DE OPERADORES DA LOJA (PDV-VS)
// ==========================================

import { empresaAtualId } from '../../core/state.js';

export async function carregarOperadoresLoja() {
    if (!empresaAtualId) return;

    const [{ data: operadores }, { data: caixasAbertos }] = await Promise.all([
        window.supabaseClient.from('usuarios_empresas').select('*').eq('empresa_id', empresaAtualId),
        window.supabaseClient.from('caixas').select('user_id, status, faturamento_dia').eq('empresa_id', empresaAtualId).eq('status', 'ABERTO')
    ]);

    const mapaCaixas = {};
    (caixasAbertos || []).forEach(c => { mapaCaixas[c.user_id] = c; });

    let html = '';
    if (operadores && operadores.length > 0) {
        operadores.forEach(op => {
            const caixaInfo = mapaCaixas[op.user_id];
            const faturamentoAtual = caixaInfo ? Number(caixaInfo.faturamento_dia || 0) : 0;
            const statusCaixaBadge = caixaInfo 
                ? `<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">ABERTO (Fat: R$ ${faturamentoAtual.toFixed(2)})</span>` 
                : '<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">FECHADO</span>';
            
            const cargoNome = op.cargo === 'admin_mercado' ? 'Administrador' : 'Operador de Caixa';

            html += `<tr class="border-b">
                <td class="p-3 text-xs font-mono">${op.user_id}</td>
                <td class="p-3 font-semibold text-slate-800">${cargoNome}</td>
                <td class="p-3 text-center">${statusCaixaBadge}</td>
                <td class="p-3 text-center">
                    ${op.cargo !== 'admin_mercado' ? `<button onclick="window.excluirOperadorLoja('${op.user_id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold"><i class="fa-solid fa-trash mr-1"></i> Remover</button>` : '<span class="text-xs text-slate-400">Principal</span>'}
                </td>
            </tr>`;
        });
    }
    const tabelaOps = document.getElementById('tabelaOperadoresLoja');
    if (tabelaOps) tabelaOps.innerHTML = html || '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum operador cadastrado.</td></tr>';
}

export async function excluirOperadorLoja(id) { 
    if (confirm('PDV-VS: Deseja remover este operador da equipe?')) { 
        await window.supabaseClient.from('usuarios_empresas').delete().eq('user_id', id); 
        await carregarOperadoresLoja(); 
    } 
}

export function abrirModalNovoOperador() { 
    window.supabaseClient.from('usuarios_empresas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaAtualId).eq('cargo', 'operador').then(({ count }) => {
        if (count >= 1) {
            alert('PDV-VS - Regra do Plano: É permitido apenas 1 operador adicional além do Administrador.');
            return;
        }
        document.getElementById('modalNovoOperador')?.classList.remove('hidden'); 
    });
}

export function fecharModalNovoOperador() { document.getElementById('modalNovoOperador')?.classList.add('hidden'); }

export async function salvarNovoOperador() {
    const email = document.getElementById('novoOpEmail')?.value.trim() || '';
    const password = document.getElementById('novoOpSenha')?.value.trim() || '';

    if (!email || !password) { alert('PDV-VS: Preencha os campos de acesso provisório.'); return; }
    
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
    if (error) { alert('PDV-VS: Erro ao criar usuário: ' + error.message); return; }
    
    if (data && data.user) {
        await window.supabaseClient.from('usuarios_empresas').insert([{ user_id: data.user.id, empresa_id: empresaAtualId, cargo: 'operador' }]);
        fecharModalNovoOperador(); 
        await carregarOperadoresLoja();
        alert('PDV-VS: Operador cadastrado com sucesso!');
    }
}

Object.assign(window, {
    carregarOperadoresLoja,
    excluirOperadorLoja,
    abrirModalNovoOperador,
    fecharModalNovoOperador,
    salvarNovoOperador
});