/**
 * Módulo: Admin Operadores (www/modules/admin/admin-operadores.js)
 * Exibe o nome real do operador (comissões/F2) com terminais fixos #01 e #02.
 */
import { supabase } from '../../core/config.js';

export async function initAdminOperadores(containerEl) {
    containerEl.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center border-b border-gray-700 pb-4">
                <div>
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-users-gear text-emerald-500"></i>
                        <span>Gestão de Operadores e Caixas</span>
                    </h2>
                    <p class="text-xs text-gray-400 mt-0.5">Acompanhe o status de abertura, faturamento diário e terminais em tempo real.</p>
                </div>
                <button onclick="window.carregarGestaoOperadores()" class="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-2 rounded-lg border border-gray-700 transition flex items-center gap-1.5">
                    <i class="fa-solid fa-rotate-right"></i> Atualizar Dados
                </button>
            </div>

            <div id="grid-operadores-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="col-span-2 text-center py-10 text-gray-500 text-sm">Carregando painel de caixas...</div>
            </div>
        </div>
    `;

    window.carregarGestaoOperadores = carregarGestaoOperadores;
    await carregarGestaoOperadores();
}

async function carregarGestaoOperadores() {
    const gridContainer = document.getElementById('grid-operadores-container');
    if (!gridContainer) return;
    const empresaId = window.empresaAtualId;
    if (!empresaId) throw new Error('Empresa não identificada para carregar o status dos caixas.');

    const [
        { data: caixas, error: erroCaixas },
        { data: perfis, error: erroPerfis }
    ] = await Promise.all([
        supabase.from('caixas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('usuarios_empresas').select('user_id, cargo').eq('empresa_id', empresaId)
    ]);

    if (erroCaixas) console.error('PDV-VS: Erro ao carregar caixas:', erroCaixas);
    if (erroPerfis) console.error('PDV-VS: Erro ao carregar perfis da empresa:', erroPerfis);
    if (erroCaixas || erroPerfis) {
        const erro = erroCaixas || erroPerfis;
        gridContainer.innerHTML = `<div class="col-span-2 text-center py-8 text-red-400 text-sm">Erro ao carregar status dos caixas. ${erro.message}</div>`;
        return;
    }

    const perfisDaEmpresa = (perfis || []).filter(perfil =>
        perfil.cargo === 'admin_mercado' || perfil.cargo === 'operador'
    );
    const usuarioAtual = window.usuarioAtual;
    if (usuarioAtual?.id
        && !perfisDaEmpresa.some(perfil => perfil.user_id === usuarioAtual.id)
        && window.cargoUsuarioAtual === 'admin_mercado') {
        perfisDaEmpresa.push({ user_id: usuarioAtual.id, cargo: 'admin_mercado' });
    }

    if (perfisDaEmpresa.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
                <i class="fa-solid fa-users-slash text-3xl text-gray-600 mb-2"></i>
                <p class="text-sm">Nenhum administrador ou operador vinculado a esta empresa.</p>
            </div>`;
        return;
    }

    const caixaMaisRecentePorUsuario = new Map();
    (caixas || []).forEach(caixa => {
        if (caixa.user_id && !caixaMaisRecentePorUsuario.has(caixa.user_id)) {
            caixaMaisRecentePorUsuario.set(caixa.user_id, caixa);
        }
    });

    perfisDaEmpresa.sort((a, b) => Number(b.cargo === 'admin_mercado') - Number(a.cargo === 'admin_mercado'));
    let numeroOperadores = 1;
    gridContainer.innerHTML = perfisDaEmpresa.map(perfil => {
        const isAdmin = perfil.cargo === 'admin_mercado';
        if (!isAdmin) numeroOperadores += 1;
        const caixa = caixaMaisRecentePorUsuario.get(perfil.user_id);
        const isOpen = String(caixa?.status || '').toUpperCase() === 'ABERTO';
        const faturamento = Number(caixa?.faturamento_dia || 0).toFixed(2);
        const valorTroco = Number(caixa?.valor_abertura || 0).toFixed(2);
        const sangrias = Number(caixa?.sangrias || 0);
        const terminalNumero = isAdmin ? '#01' : `#${String(numeroOperadores).padStart(2, '0')}`;
        const tipoPerfil = isAdmin ? 'Administrador' : 'Operador';
        const nomeExibicao = isAdmin
            ? (perfil.user_id === usuarioAtual?.id ? 'Administrador (você)' : 'Administrador')
            : (caixa?.vendedor_nome || caixa?.nome_operador || 'Operador');

        const cardBorder = isOpen ? 'border-emerald-500/50 bg-gray-900/90 shadow-emerald-950/20' : 'border-gray-800 bg-gray-900/60';
        const statusBadge = isOpen 
            ? '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center w-fit gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Caixa Aberto</span>'
            : '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/60 text-red-400 border border-red-900 flex items-center w-fit gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500"></span> Caixa Fechado</span>';

        return `
            <div class="border ${cardBorder} rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-4 transition-all">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">${tipoPerfil}</span>
                        <h3 class="font-bold text-base text-white mt-0.5 truncate max-w-[240px]" title="${nomeExibicao}">
                            ${nomeExibicao}
                        </h3>
                    </div>
                    <div>${statusBadge}</div>
                </div>

                <div class="grid grid-cols-2 gap-3 bg-gray-950/50 p-3.5 rounded-xl border border-gray-800/80">
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Faturamento do Dia</span>
                        <span class="text-lg font-extrabold text-emerald-400 font-mono">R$ ${faturamento}</span>
                    </div>
                    <div>
                        <span class="text-[11px] text-gray-400 block font-medium">Troco Inicial</span>
                        <span class="text-sm font-bold text-gray-200 font-mono">R$ ${valorTroco}</span>
                        ${sangrias ? `<span class="text-[10px] text-amber-400 block">Sangrias: R$ ${sangrias.toFixed(2)}</span>` : ''}
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-800 text-xs text-gray-400">
                    <span>Terminal / Caixa: <strong class="text-emerald-400">${terminalNumero}</strong></span>
                    <span class="text-[11px] text-gray-500">${caixa ? 'Tempo real' : 'Sem sessão registrada'}</span>
                </div>
            </div>
        `;
    }).join('');
}