/**
 * Módulo de Gestão da Câmara para Leitura de Código de Barras / QR Code
 * Dependência: html5-qrcode.min.js
 */

// Estado global do leitor
let html5QrCodeScanner = null;
let leituraBloqueada = false;
const ID_ELEMENTO_CONTAINER = "reader"; // Certifique-se que existe um <div id="reader"></div> no seu HTML

/**
 * Emite um som sintético de bipe para confirmação de leitura
 */
function tocarBipeLeitura() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 1800; // Frequência do bipe (Hz)
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12); // Duração: 120ms
  } catch (err) {
    console.warn("Não foi possível reproduzir o bipe sonoro:", err);
  }
}

/**
 * Callback disparado quando um código é lido com sucesso
 */
function onScanSuccess(decodedText, decodedResult) {
  if (leituraBloqueada) return;

  // Bloqueia temporariamente para evitar múltiplas leituras seguidas do mesmo item
  leituraBloqueada = true;

  console.log(`[CÂMARA] Código lido: ${decodedText}`);

  // 1. Toca o sinal sonoro
  tocarBipeLeitura();

  // 2. Envia o código lido para a função do caixa (caixa-core.js)
  if (typeof window.adicionarProdutoPorCodigo === "function") {
    window.adicionarProdutoPorCodigo(decodedText);
  } else if (typeof window.processarCodigoLido === "function") {
    window.processarCodigoLido(decodedText);
  } else {
    console.warn("Nenhuma função global de recebimento de código foi encontrada (ex: adicionarProdutoPorCodigo).");
  }

  // 3. Libertação da trava após 1.5 segundos
  setTimeout(() => {
    leituraBloqueada = false;
  }, 1500);
}

/**
 * Callback silencioso para tentativas de leitura contínuas
 */
function onScanFailure(error) {
  // Ignorado intencionalmente para não poluir a consola enquanto procura códigos
}

/**
 * Inicia o stream da câmara
 */
async function iniciarCamera() {
  const container = document.getElementById(ID_ELEMENTO_CONTAINER);
  
  if (!container) {
    console.error(`[CÂMARA] Elemento #${ID_ELEMENTO_CONTAINER} não encontrado no DOM.`);
    alert("Erro interno: Contentor da câmara não encontrado na página.");
    return;
  }

  // Se já estiver a rodar, não reinicia
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    console.log("[CÂMARA] A câmara já está ativa.");
    return;
  }

  try {
    if (!html5QrCodeScanner) {
      html5QrCodeScanner = new Html5Qrcode(ID_ELEMENTO_CONTAINER);
    }

    const config = {
      fps: 12, // Frame rate otimizado para leitura sem aquecer o dispositivo
      qrbox: { width: 260, height: 140 }, // Retângulo alongado (ideal para códigos de barras 1D)
      aspectRatio: 1.777778
    };

    // Tenta utilizar preferencialmente a câmara traseira ("environment")
    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    );

    console.log("[CÂMARA] Iniciada com sucesso.");
  } catch (err) {
    console.error("[CÂMARA] Erro ao iniciar:", err);
    alert("Erro ao aceder à câmara. Verifique se concedeu as permissões necessárias no navegador.");
  }
}

/**
 * Interrompe a câmara e liberta a lente/hardware
 */
async function pararCamera() {
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    try {
      await html5QrCodeScanner.stop();
      console.log("[CÂMARA] Desativada com sucesso.");
    } catch (err) {
      console.error("[CÂMARA] Erro ao parar:", err);
    }
  }
}

/**
 * Alterna o estado da câmara (liga se estiver desligada, desliga se estiver ligada)
 */
async function alternarCamera() {
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    await pararCamera();
  } else {
    await iniciarCamera();
  }
}

// Expõe as funções para a janela global (para ser chamado pelos botões do HTML)
window.iniciarCamera = iniciarCamera;
window.pararCamera = pararCamera;
window.alternarCamera = alternarCamera;