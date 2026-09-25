// ==========================================
// MÓDULO DE ESTADO GLOBAL (PDV-VS)
// ==========================================

export const VERSAO_SISTEMA = "v1.0.2";

export let deferredPrompt = null;
export let modoTelaAuth = 'login';
export let usuarioAtual = null;
export let empresaAtualId = null;
export let cargoUsuarioAtual = null;
export let dadosEmpresaAtual = null;
export let caixaAberto = false;
export let faturamentoDia = 0;
export let acaoCaixaAtual = 'abrir';
export let produtosCache = [];
export let itensVenda = [];
export let indiceItemParaRemover = null;
export let produtoEmPesagemAtual = null;
export let historicoVendasCache = [];
export let origemLeitor = 'busca';
export let html5QrcodeInstance = null;
export let listaEmpresasCache = [];
export let tokenSessaoAtual = null; // Novo: Armazena o token único da sessão ativa

// Adicionar dentro do seu objeto de estado principal
export const state = {
  // ... seus dados atuais mantidos
  plano: {
    nome: "Básico",
    limiteProdutos: 1000,
    limiteOperadores: 1,
    diasHistorico: 30
  }
};

// Função para aplicar upgrade manualmente
export function atualizarPlano(novoPlano) {
  state.plano = { ...state.plano, ...novoPlano };
}

// Funções para alterar o estado quando necessário
export function setDeferredPrompt(val) { deferredPrompt = val; }
export function setModoTelaAuth(val) { modoTelaAuth = val; }
export function setUsuarioAtual(val) { usuarioAtual = val; }
export function setEmpresaAtualId(val) { empresaAtualId = val; }
export function setCargoUsuarioAtual(val) { cargoUsuarioAtual = val; }
export function setDadosEmpresaAtual(val) { dadosEmpresaAtual = val; }
export function setCaixaAberto(val) { caixaAberto = val; }
export function setFaturamentoDia(val) { faturamentoDia = val; }
export function setAcaoCaixaAtual(val) { acaoCaixaAtual = val; }
export function setProdutosCache(val) { produtosCache = val; }
export function setItensVenda(val) { itensVenda = val; }
export function setIndiceItemParaRemover(val) { indiceItemParaRemover = val; }
export function setProdutoEmPesagemAtual(val) { produtoEmPesagemAtual = val; }
export function setHistoricoVendasCache(val) { historicoVendasCache = val; }
export function setOrigemLeitor(val) { origemLeitor = val; }
export function setHtml5QrcodeInstance(val) { html5QrcodeInstance = val; }
export function setListaEmpresasCache(val) { listaEmpresasCache = val; }
export function setTokenSessaoAtual(val) { tokenSessaoAtual = val; } // Novo: Modificador do token de sessão