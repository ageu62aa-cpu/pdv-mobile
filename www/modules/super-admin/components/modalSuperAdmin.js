Apply
// Antes: import { state, produtosCache } from './state.js';
// Depois:
import { state, produtosCache } from '../state.js';
// Renderiza o HTML do Modal de Super Administrador
export function renderModalSuperAdmin() {
    return `
        <div id="modalSuperAdminMaster" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-scaleUp space-y-5">
                
                <!-- Cabeçalho -->
                <div class="flex justify-between items-center border-b pb-3">
                    <div class="flex items-center space-x-2">
                        <div class="p-2 bg-amber-100 text-amber-700 rounded-xl">
                            <i class="fa-solid fa-user-gear text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">Painel Super Administrador</h3>
                            <p class="text-xs text-slate-500">Gestão global de estabelecimentos, auditoria e parâmetros do sistema.</p>
                        </div>
                    </div>
                    <button type="button" onclick="window.fecharModalSuperAdmin()" class="text-slate-400 hover:text-slate-600 p-1 transition">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <!-- Painel de Ações Rápidas -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onclick="window.listarTodasLojas()" class="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition group flex flex-col justify-between space-y-2">
                        <div class="flex items-center justify-between w-full">
                            <i class="fa-solid fa-store text-emerald-600 text-lg"></i>
                            <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Lojas</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs text-slate-800 group-hover:text-emerald-900">Gerenciar Lojas</h4>
                            <p class="text-[11px] text-slate-500">Visualizar e cadastrar filiais/clientes</p>
                        </div>
                    </button>

                    <button onclick="window.auditoriaSistema()" class="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition group flex flex-col justify-between space-y-2">
                        <div class="flex items-center justify-between w-full">
                            <i class="fa-solid fa-shield-halved text-blue-600 text-lg"></i>
                            <span class="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Segurança</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs text-slate-800 group-hover:text-blue-900">Auditoria de Acessos</h4>
                            <p class="text-[11px] text-slate-500">Consultar logs e tentativas de login</p>
                        </div>
                    </button>

                    <button onclick="window.configuracoesGlobais()" class="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition group flex flex-col justify-between space-y-2">
                        <div class="flex items-center justify-between w-full">
                            <i class="fa-solid fa-sliders text-amber-600 text-lg"></i>
                            <span class="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Sistema</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs text-slate-800 group-hover:text-amber-900">Configurações Globais</h4>
                            <p class="text-[11px] text-slate-500">Ajustar parâmetros gerais da plataforma</p>
                        </div>
                    </button>
                </div>

                <!-- Tabela Dinâmica / Área de Conteúdo -->
                <div id="containerConteudoSuperAdmin" class="border rounded-xl overflow-hidden bg-slate-50 min-h-[200px]">
                    <div class="p-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[200px]">
                        <i class="fa-solid fa-list-check text-2xl mb-2 text-slate-300"></i>
                        <span>Selecione uma opção acima para carregar as informações.</span>
                    </div>
                </div>

                <!-- Ações do Modal -->
                <div class="flex justify-end pt-2 border-t">
                    <button type="button" onclick="window.fecharModalSuperAdmin()" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">
                        Fechar
                    </button>
                </div>

            </div>
        </div>
    `;
}

// Injeta o modal no DOM dinamicamente
export function abrirModalSuperAdmin() {
    const container = document.getElementById('containerModaisDinamicos');
    if (!container) return;

    container.innerHTML = renderModalSuperAdmin();
}

// Remove o modal do DOM
export function fecharModalSuperAdmin() {
    const container = document.getElementById('containerModaisDinamicos');
    if (container) container.innerHTML = '';
}

// Exemplo de manipuladores para as ações do Super Admin
export function listarTodasLojas() {
    const areaConteudo = document.getElementById('containerConteudoSuperAdmin');
    if (!areaConteudo) return;

    areaConteudo.innerHTML = `
        <div class="overflow-x-auto max-h-[250px]">
            <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b">
                    <tr>
                        <th class="p-2.5">Estabelecimento</th>
                        <th class="p-2.5">Documento</th>
                        <th class="p-2.5">Cidade/UF</th>
                        <th class="p-2.5 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody id="tabelaSuperAdminClientes" class="divide-y bg-white">
                    <tr>
                        <td colspan="4" class="p-4 text-center text-slate-400">Carregando lista de lojas...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Chama a função global de buscar clientes se existir
    if (window.carregarClientesSuperAdmin) {
        window.carregarClientesSuperAdmin();
    }
}

export function auditoriaSistema() {
    const areaConteudo = document.getElementById('containerConteudoSuperAdmin');
    if (!areaConteudo) return;

    areaConteudo.innerHTML = `
        <div class="p-4 text-xs space-y-2">
            <h4 class="font-bold text-slate-800 border-b pb-1">Logs Recentes do Sistema</h4>
            <ul class="space-y-1 font-mono text-[11px] text-slate-600 max-h-[180px] overflow-y-auto">
                <li class="p-1.5 bg-white border rounded">[INFO] Acesso do usuário admin efetuado com sucesso.</li>
                <li class="p-1.5 bg-white border rounded">[INFO] Caixa #01 aberto pelo operador.</li>
            </ul>
        </div>
    `;
}

export function configuracoesGlobais() {
    const areaConteudo = document.getElementById('containerConteudoSuperAdmin');
    if (!areaConteudo) return;

    areaConteudo.innerHTML = `
        <div class="p-4 text-xs space-y-3 bg-white">
            <h4 class="font-bold text-slate-800 border-b pb-1">Parâmetros Globais</h4>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-semibold mb-1">Versão do Sistema</label>
                    <input type="text" value="v1.0.3" disabled class="w-full border p-2 rounded bg-slate-100 text-slate-500">
                </div>
                <div>
                    <label class="block font-semibold mb-1">Modo de Manutenção</label>
                    <select class="w-full border p-2 rounded bg-white">
                        <option value="false">Desativado</option>
                        <option value="true">Ativado</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

// Exposição das funções para escopo global (onclick)
window.abrirModalSuperAdmin = abrirModalSuperAdmin;
window.fecharModalSuperAdmin = fecharModalSuperAdmin;
window.listarTodasLojas = listarTodasLojas;
window.auditoriaSistema = auditoriaSistema;
window.configuracoesGlobais = configuracoesGlobais;