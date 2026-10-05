/**
 * Módulo de Gestão da Câmara para Leitura de Código de Barras / QR Code
 * Dependência: html5-qrcode.min.js
 */

var html5QrCodeScanner = null;
var leituraBloqueada = false;
var ID_ELEMENTO_CONTAINER = "reader";

/**
 * Emite um som sintético de bipe para confirmação de leitura
 */
function tocarBipeLeitura() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    var audioCtx = new AudioContext();
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

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
  console.log("[CÂMARA] Código lido:", decodedText);

  tocarBipeLeitura();

  if (typeof window.adicionarProdutoPorCodigo === "function") {
    window.adicionarProdutoPorCodigo(decodedText);
  } else if (typeof window.processarCodigoLido === "function") {
    window.processarCodigoLido(decodedText);
  } else {
    console.warn("Nenhuma função global de recebimento de código foi encontrada.");
  }

  setTimeout(function() {
    leituraBloqueada = false;
  }, 1500);
}

function onScanFailure(error) {
  // Ignorado durante o scanning
}

/**
 * Injeta a div #reader dinamicamente caso não exista no DOM
 */
function garantirElementoReader() {
  var container = document.getElementById(ID_ELEMENTO_CONTAINER);
  if (!container) {
    console.log("[CÂMARA] Criando elemento #reader dinamicamente...");
    container = document.createElement("div");
    container.id = ID_ELEMENTO_CONTAINER;
    container.style.width = "100%";
    container.style.minHeight = "250px";
    container.style.backgroundColor = "#000";
    container.style.borderRadius = "8px";
    container.style.overflow = "hidden";
    
    // Tenta anexar num painel existente ou ao body
    var painelOuMain = document.querySelector("main") || document.body;
    painelOuMain.appendChild(container);
  }
  return container;
}

async function iniciarCamera() {
  var container = garantirElementoReader();

  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    console.log("[CÂMARA] A câmara já está ativa.");
    return;
  }

  try {
    if (!html5QrCodeScanner) {
      html5QrCodeScanner = new Html5Qrcode(ID_ELEMENTO_CONTAINER);
    }

    var config = {
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

async function alternarCamera() {
  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    await pararCamera();
  } else {
    await iniciarCamera();
  }
}

function inicializarLeitorTecladoPistola() {
  console.log("[LEITOR PISTOLA] Pronto para leitura de teclado.");
}

// Vincula todas as funções ao objeto global window
window.tocarBipeLeitura = tocarBipeLeitura;
window.iniciarCamera = iniciarCamera;
window.pararCamera = pararCamera;
window.alternarCamera = alternarCamera;
window.abrirLeitorCamera = iniciarCamera;
window.abrirCameraScanner = iniciarCamera;
window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;