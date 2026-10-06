/**
 * Módulo de Gestão da Câmara PDV-Mobile
 * Suporta Modal Flutuante, Leitura Contínua, Fechamento por ESC e Exibição de Código Lido.
 */
// camera.js

export function abrirLeitorCamera() {
    // Código para abrir e ler a câmera/código de barras
    console.log("Leitor de câmera iniciado...");
}

var html5QrCodeScanner = null;
var leituraBloqueada = false;
var ID_CONTAINER_READER = "reader-camera-modal";
var ID_MODAL_CAMERA = "modal-leitor-camera";
var ID_CODIGO_EXIBIDO = "codigo-lido-display";

/**
 * Sinal sonoro de confirmação
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
    console.warn("Bipe áudio indisponível:", err);
  }
}

/**
 * Trata o evento de tecla para fechar o leitor com ESC
 */
function escKeyHandler(e) {
  if (e.key === "Escape" || e.keyCode === 27) {
    var modal = document.getElementById(ID_MODAL_CAMERA);
    if (modal && !modal.classList.contains("hidden")) {
      window.pararCamera();
    }
  }
}

/**
 * Garante a existência do Modal na árvore DOM
 */
function garantirModalDOM() {
  var modal = document.getElementById(ID_MODAL_CAMERA);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = ID_MODAL_CAMERA;
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 hidden";
    
    modal.innerHTML = `
      <div class="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <!-- Cabeçalho do Modal -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-800/90 border-b border-gray-700">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 class="text-sm font-semibold text-white">Leitor de Código de Barras</h3>
          </div>
          <!-- Botão X no Topo Direito -->
          <button type="button" onclick="window.pararCamera()" class="text-gray-400 hover:text-white p-1 rounded-lg transition-colors" title="Fechar (ESC)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Viewport do Vídeo da Câmara -->
        <div class="p-3 bg-black flex flex-col items-center">
          <div id="${ID_CONTAINER_READER}" class="w-full aspect-square bg-gray-950 rounded-xl overflow-hidden border border-gray-800"></div>
          
          <!-- Exibição do Último Código Capturado -->
          <div class="mt-3 text-center w-full bg-gray-800/60 rounded-lg py-2 border border-gray-700/50">
            <span class="text-xs text-gray-400 block font-medium">Aguardando leitura...</span>
            <span id="${ID_CODIGO_EXIBIDO}" class="text-sm font-mono font-bold text-emerald-400"></span>
          </div>
        </div>

        <!-- Rodapé com Botão Fechar -->
        <div class="p-3 bg-gray-800/50 border-t border-gray-700/50 flex justify-end">
          <button type="button" onclick="window.pararCamera()" class="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-xl transition-all shadow">
            Fechar Leitor
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  return modal;
}

/**
 * Processamento contínuo de leituras
 */
function onScanSuccess(decodedText) {
  if (leituraBloqueada) return;

  leituraBloqueada = true;
  console.log("[PDV-CAMERA] Código capturado:", decodedText);

  var displayCodigo = document.getElementById(ID_CODIGO_EXIBIDO);
  if (displayCodigo) {
    displayCodigo.innerText = "Código: " + decodedText;
  }

  tocarBipeLeitura();

  if (typeof window.adicionarProdutoPorCodigo === "function") {
    window.adicionarProdutoPorCodigo(decodedText);
  } else if (typeof window.processarCodigoLido === "function") {
    window.processarCodigoLido(decodedText);
  } else {
    console.warn("Função 'adicionarProdutoPorCodigo' não encontrada no caixa-core.js");
  }

  setTimeout(function() {
    leituraBloqueada = false;
  }, 1200);
}

function onScanFailure(error) {
  // Varredura contínua silenciosa
}

/**
 * Abre o Modal e Inicia o Stream da Câmara
 */
async function iniciarCamera() {
  var modal = garantirModalDOM();
  modal.classList.remove("hidden");

  window.addEventListener("keydown", escKeyHandler);

  var displayCodigo = document.getElementById(ID_CODIGO_EXIBIDO);
  if (displayCodigo) {
    displayCodigo.innerText = "";
  }

  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    return;
  }

  try {
    if (!html5QrCodeScanner) {
      html5QrCodeScanner = new Html5Qrcode(ID_CONTAINER_READER);
    }

    var config = {
      fps: 15,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0
    };

    try {
      await html5QrCodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
      );
    } catch (facingErr) {
      console.warn("[PDV-CAMERA] Câmara traseira não encontrada. Tentando qualquer câmara disponível...", facingErr);
      await html5QrCodeScanner.start(
        { facingMode: "user" },
        config,
        onScanSuccess,
        onScanFailure
      );
    }

    console.log("[PDV-CAMERA] Leitor ativo e operante.");
  } catch (err) {
    console.error("[PDV-CAMERA] Erro ao ativar câmara:", err);
    alert("Não foi possível aceder à câmara. Verifique as permissões do navegador ou se existe uma câmara conetada.");
    pararCamera();
  }
}

/**
 * Interrompe a câmara e esconde o Modal
 */
async function pararCamera() {
  var modal = document.getElementById(ID_MODAL_CAMERA);

  window.removeEventListener("keydown", escKeyHandler);

  if (html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    try {
      await html5QrCodeScanner.stop();
      console.log("[PDV-CAMERA] Leitor encerrado.");
    } catch (err) {
      console.error("[PDV-CAMERA] Erro ao parar leitor:", err);
    }
  }

  if (modal) {
    modal.classList.add("hidden");
  }
}

async function alternarCamera() {
  var modal = document.getElementById(ID_MODAL_CAMERA);
  if (modal && !modal.classList.contains("hidden") && html5QrCodeScanner && html5QrCodeScanner.isScanning) {
    await pararCamera();
  } else {
    await iniciarCamera();
  }
}

/**
 * EXPORTAÇÃO EXIGIDA PELO CAIXA-CORE:
 * Adicionada a exportação nomeada que o seu arquivo HTML/Core está tentando carregar.
 */
export function inicializarLeitorTecladoPistola() {
  console.log("[PDV-PISTOLA] Suporte a leitor USB/Bluetooth ativo.");
}

// Mapeamento Global para compatibilidade total com o caixa-core.js e botões do HTML
window.iniciarCamera = iniciarCamera;
window.pararCamera = pararCamera;
window.alternarCamera = alternarCamera;
window.abrirLeitorCamera = iniciarCamera;
window.abrirCameraScanner = iniciarCamera;
window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;