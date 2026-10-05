/**
 * Módulo de Gestão da Câmara para Leitura de Código de Barras / QR Code
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
  // Ignorado durante a varredura contínua
}

export async function iniciarCamera() {
  // Aguarda 100ms para garantir que o DOM/Modal já foi renderizado
  await new Promise((resolve) => setTimeout(resolve, 100));

  const container = document.getElementById(ID_ELEMENTO_CONTAINER);
  
  if (!container) {
    console.error(`[CÂMARA] Elemento #${ID_ELEMENTO_CONTAINER} não encontrado no DOM.`);
    alert("Certifique-se de que o painel da câmara (<div id=\"reader\"></div>) está aberto ou presente na página.");
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
    alert("Erro ao aceder à câmara. Verifique se concedeu as permissões necessárias no navegador.");
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

export function inicializarLeitorTecladoPistola() {
  console.log("[LEITOR PISTOLA] Inicializado.");
}

// Aliases exportados
export const abrirLeitorCamera = iniciarCamera;
export const abrirCameraScanner = iniciarCamera;

// Exposição global
if (typeof window !== "undefined") {
  window.iniciarCamera = iniciarCamera;
  window.pararCamera = pararCamera;
  window.alternarCamera = alternarCamera;
  window.abrirLeitorCamera = iniciarCamera;
  window.abrirCameraScanner = iniciarCamera;
  window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;
}