// ==========================================
// PONTO DE ENTRADA PRINCIPAL - MAIN.JS (PDV-VS)
// ==========================================

import * as auth from './auth.js';
import * as caixa from './caixa.js';
import * as produtos from './produtos.js';
import * as admin from './admin.js';
import * as camera from './camera.js';
import * as state from './state.js';

// Expor funções globalmente para chamadas diretas via onclick="" nos atributos HTML
window.instalarPwaApp = auth.instalarPwaApp;
window.alternarTelaAuth = auth.alternarTelaAuth;
window.tratarEnterLogin = auth.tratarEnterLogin;
window.processarAutenticacao = auth.processarAutenticacao;
window.solicitarRecuperacaoSenha = auth.solicitarRecuperacaoSenha;
window.abrirSuperAdminMaster = auth.abrirSuperAdminMaster;
window.fecharSuperAdminMaster = auth.fecharSuperAdminMaster;
window.alternarStatusEmpresa = auth.alternarStatusEmpresa;

window.atualizarPaginaCompleta = caixa.atualizarPaginaCompleta;
window.realizarLogout = caixa.realizarLogout;
window.focarBusca = caixa.focarBusca;
window.gerenciarCaixaModal = caixa.gerenciarCaixaModal;
window.tratarEnterModalCaixa = caixa.tratarEnterModalCaixa;
window.fecharModalCaixa = caixa.fecharModalCaixa;
window.confirmarAcaoCaixa = caixa.confirmarAcaoCaixa;
window.salvarPinAdmin = caixa.salvarPinAdmin;
window.solicitarRemocaoItem = caixa.solicitarRemocaoItem;
window.tratarEnterModalAutorizacao = caixa.tratarEnterModalAutorizacao;
window.confirmarAutorizacaoPin = caixa.confirmarAutorizacaoPin;
window.fecharModalAutorizacao = caixa.fecharModalAutorizacao;
window.abrirModalCancelarItem = caixa.abrirModalCancelarItem;
window.fecharModalCancelarItem = caixa.fecharModalCancelarItem;
window.cancelarVenda = caixa.cancelarVenda;
window.finalizarVenda = caixa.finalizarVenda;
window.alterarQtd = caixa.alterarQtd;

window.aoDigitarBusca = produtos.aoDigitarBusca;
window.adicionarItemVendaPorObjeto = produtos.adicionarItemVendaPorObjeto;
window.abrirModalPesagemManual = produtos.abrirModalPesagemManual;
window.calcularValorParcialPeso = produtos.calcularValorParcialPeso;
window.tratarEnterModalPesagem = produtos.tratarEnterModalPesagem;
window.fecharModalPesagemManual = produtos.fecharModalPesagemManual;
window.confirmarAdicaoPeso = produtos.confirmarAdicaoPeso;
window.tratarEnterBuscaCaixa = produtos.tratarEnterBuscaCaixa;

window.mudarAbaAdmin = admin.mudarAbaAdmin;
window.recarregarDadosAdmin = admin.recarregarDadosAdmin;
window.abrirPainelAdmin = admin.abrirPainelAdmin;
window.fecharPainelAdmin = admin.fecharPainelAdmin;
window.renderizarTabelaAdmin = admin.renderizarTabelaAdmin;
window.filtrarTabelaAdmin = admin.filtrarTabelaAdmin;
window.abrirModalNovoProdutoAdmin = admin.abrirModalNovoProdutoAdmin;
window.abrirEditarProdutoAdmin = admin.abrirEditarProdutoAdmin;
window.fecharFormProduto = admin.fecharFormProduto;
window.salvarProdutoAdmin = admin.salvarProdutoAdmin;
window.excluirProdutoAdmin = admin.excluirProdutoAdmin;
window.excluirOperadorLoja = admin.excluirOperadorLoja;
window.abrirModalNovoOperador = admin.abrirModalNovoOperador;
window.fecharModalNovoOperador = admin.fecharModalNovoOperador;
window.salvarNovoOperador = admin.salvarNovoOperador;

window.abrirLeitorCamera = camera.abrirLeitorCamera;
window.escanearCameraAdmin = camera.escanearCameraAdmin;
window.fecharLeitorCamera = camera.fecharLeitorCamera;

console.log("PDV-VS: Todos os módulos JavaScript foram carregados com sucesso!");
// Expondo funções para o escopo global (para o HTML / onclick funcionar)
window.alternarTelaAuth = alternarTelaAuth;
window.tratarEnterLogin = tratarEnterLogin;
window.processarAutenticacao = processarAutenticacao;
window.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;
window.abrirSuperAdminMaster = abrirSuperAdminMaster;
window.fecharSuperAdminMaster = fecharSuperAdminMaster;
window.alternarStatusEmpresa = alternarStatusEmpresa;
window.instalarPwaApp = instalarPwaApp;