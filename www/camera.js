/**
 * Módulo de Gestão da Câmara e Leitor de Código de Barras / QR Code
 * Dependência: html5-qrcode.min.js
 */

let html5QrCodeScanner = null;
let leituraBloqueada = false;
const ID_ELEMENTO_CONTAINER = "reader";

/**
 * Emite um som sintético de bipe para confirmação de leitura
 */
export function tocarBipeLeitura() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 1800;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    console.warn("Não foi possível reproduzir o bipe sonoro:", err);
  }
}

function onScanSuccess(decodedText) {
  if (leituraBloqueada) return;

  leituraBloqueada = true;
  console.log(`[CÂMARA] Código lido: ${decodedText}`);

  tocarBipeLeitura();

  if (typeof window.adicionarProdutoPorCodigo === "function") {
    window.adicionarProdutoPorCodigo(decodedText);
  } else if (typeof window.processarCodigoLido === "function") {
    window.processarCodigoLido(decodedText);
  } else {
    console.warn("Nenhuma função global de recebimento de código foi encontrada.");
  }

  setTimeout(() => {
    leituraBloqueada = false;
  }, 1500);
}

function onScanFailure(error) {
  // Ignorado intencionalmente durante a varredura
}

export async function iniciarCamera() {
  const container = document.getElementById(ID_ELEMENTO_CONTAINER);
  
  if (!container) {
    console.error(`[CÂMARA] Elemento #${ID_ELEMENTO_CONTAINER} não encontrado no DOM.`);
    alert("Erro interno: Contentor da câmara (#reader) não encontrado na página.");
    return;
  }

  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    console.log("[CÂMARA] A câmara já está ativa.");
    return;
  }

  try {
    if (!html5QrCodeScanner) {
      html5QrCodeScanner = new Html5Qrcode(ID_ELEMENTO_CONTAINER);
    }

    const config = {
      fps: 12,
      qrbox: { width: 260, height: 140 },
      aspectRatio: 1.777778
    };

    await html5QrCodeScanner.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    );

    console.log("[CÂMARA] Iniciada com sucesso.");
  } catch (err) {
    console.error("[CÂMARA] Erro ao iniciar:", err);
    alert("Erro ao aceder à câmara. Verifique se concedeu as permissões necessárias.");
  }
}

export async function pararCamera() {
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    try {
      await html5QrCodeScanner.stop();
      console.log("[CÂMARA] Desativada com sucesso.");
    } catch (err) {
      console.error("[CÂMARA] Erro ao parar:", err);
    }
  }
}

export async function alternarCamera() {
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    await pararCamera();
  } else {
    await iniciarCamera();
  }
}

/**
 * Inicializador para leitores físicos (pistolas USB/Bluetooth) que emulam teclado
 */
export function inicializarLeitorTecladoPistola() {
  console.log("[LEITOR PISTOLA] Inicializado ou pronto para captura via teclado.");
  // A lógica de captura do scanner físico pode ser encadeada aqui se necessário
}

// Aliases exportados para atender ao import do caixa-core.js
export const abrirLeitorCamera = iniciarCamera;
export const abrirCameraScanner = iniciarCamera;

// Exposição no escopo global (window)
if (typeof window !== "undefined") {
  window.iniciarCamera = iniciarCamera;
  window.pararCamera = pararCamera;
  window.alternarCamera = alternarCamera;
  window.abrirLeitorCamera = iniciarCamera;
  window.abrirCameraScanner = iniciarCamera;
  window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;
}