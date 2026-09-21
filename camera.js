// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;
let ultimoBlobCapturado = null; // Armazena a imagem da moldura capturada pelo botão

export async function abrirLeitorCamera() {
    console.log("PDV-VS: Abrindo leitor para Vendas (busca)");
    setOrigemLeitor('busca');
    prepararModalCameraVisual();
    await iniciarCameraComHtml5Qrcode();
}

export async function escanearCameraAdmin() {
    console.log("PDV-VS: Abrindo leitor para Admin");
    setOrigemLeitor('admin');
    prepararModalCameraVisual();
    await iniciarCameraComHtml5Qrcode();
}

function prepararModalCameraVisual() {
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) {
        modalCam.style.zIndex = "99999";
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');

        let containerManual = document.getElementById('containerManualCamera');
        if (!containerManual) {
            const cardModal = modalCam.querySelector('div') || modalCam;
            containerManual = document.createElement('div');
            containerManual.id = 'containerManualCamera';
            containerManual.style.cssText = "margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; z-index: 100000; position: relative;";
            
            containerManual.innerHTML = `
                <!-- Controles divididos: Botão 1 para Capturar a Imagem e Feedback visual -->
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
                    <span id="txtStatusCaptura" style="font-size: 11px; color: #64748b; font-weight: 600;">1. Aponte e clique em 'Capturar'</span>
                    <button type="button" id="btnCapturarMoldura" style="background: #0ea5e9; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px;">
                        📸 Capturar Frame
                    </button>
                </div>

                <!-- Campo e Botão 2 (OK) para processar a imagem capturada ou ler o texto -->
                <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                    <input type="text" id="inputCodigoManual" placeholder="Ou digite o código manualmente..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none; background: #fff; color: #000;" />
                    <button type="button" id="btnProcessarLeitura" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
                </div>
            `;
            cardModal.appendChild(containerManual);

            // BOTÃO 1: Captura o frame atual da moldura da câmera
            const btnCapturar = document.getElementById('btnCapturarMoldura');
            btnCapturar.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                executarCapturaDeFrame();
            };

            // BOTÃO 2 (OK): Processa a imagem capturada ou lê o input
            const btnProcessar = document.getElementById('btnProcessarLeitura');
            btnProcessar.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await executarProcessamentoFinal();
            };

            const inp = document.getElementById('inputCodigoManual');
            inp.onkeydown = async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    await executarProcessamentoFinal();
                }
            };
        }
        
        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.value = '';
            ultimoBlobCapturado = null;
            setTimeout(() => inp.focus(), 150);
        }

        const txtStatus = document.getElementById('txtStatusCaptura');
        if (txtStatus) txtStatus.innerText = "1. Aponte e clique em 'Capturar'";

        // Listener global para pistolas USB/Bluetooth
        if (listenerTecladoGlobal) {
            window.removeEventListener('keydown', listenerTecladoGlobal);
        }

        let bufferLeitor = '';
        let ultimoTempo = Date.now();

        listenerTecladoGlobal = (e) => {
            const tempoAtual = Date.now();
            const modalEstaAtivo = modalCam && !modalCam.classList.contains('hidden');

            if (!modalEstaAtivo) return;

            if (tempoAtual - ultimoTempo > 100) {
                bufferLeitor = '';
            }
            ultimoTempo = tempoAtual;

            if (e.key === 'Enter') {
                if (bufferLeitor.trim().length > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    const codigoLido = bufferLeitor.trim();
                    bufferLeitor = '';
                    processarCodigoCapturado(codigoLido);
                }
            } else if (e.key.length === 1) {
                bufferLeitor += e.key;
                if (document.activeElement !== inp && inp) {
                    inp.value += e.key;
                }
            }
        };

        window.addEventListener('keydown', listenerTecladoGlobal);
    }
}

// Função do Botão 1: Salva o frame da câmera na memória
function executarCapturaDeFrame() {
    const videoElement = document.querySelector('#videoPreviewCamera video');
    const txtStatus = document.getElementById('txtStatusCaptura');
    const inp = document.getElementById('inputCodigoManual');

    if (!videoElement) {
        alert("Câmera não encontrada.");
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        if (!blob) {
            alert("Erro ao gerar imagem da moldura.");
            return;
        }
        ultimoBlobCapturado = blob;
        if (txtStatus) {
            txtStatus.innerText = "✅ Frame capturado! Clique em OK para ler.";
            txtStatus.style.color = "#16a34a";
        }
        if (inp) inp.focus();
    }, 'image/png');
}

// Função do Botão 2 (OK): Tenta ler a imagem capturada ou usa o texto digitado
async function executarProcessamentoFinal() {
    const inp = document.getElementById('inputCodigoManual');
    const txtStatus = document.getElementById('txtStatusCaptura');
    if (!inp) return;

    const textoDigitado = inp.value.trim();

    // Se o usuário digitou algo no campo, usa diretamente
    if (textoDigitado.length > 0) {
        processarCodigoCapturado(textoDigitado);
        return;
    }

    // Se tem uma imagem capturada pelo Botão 1, tenta decodificá-la agora
    if (ultimoBlobCapturado) {
        if (txtStatus) txtStatus.innerText = "⏳ Analisando imagem capturada...";
        
        try {
            const arquivo = new File([ultimoBlobCapturado], "frame.png", { type: "image/png" });
            const scannerTemp = new window.Html5Qrcode("videoPreviewCamera");
            const codigoLido = await scannerTemp.scanFile(arquivo, true);

            if (codigoLido) {
                processarCodigoCapturado(codigoLido.trim());
                return;
            }
        } catch (err) {
            console.warn("Decodificação estática falhou:", err);
        }

        // Se falhou em ler a imagem automaticamente, avisa de forma limpa e foca no input para digitação rápida
        if (txtStatus) {
            txtStatus.innerText = "⚠️ Não leu sozinho. Digite o número e clique OK.";
            txtStatus.style.color = "#dc2626";
        }
        inp.focus();
    } else {
        alert("Por favor, capture um frame da moldura ou digite o código.");
        inp.focus();
    }
}

function processarCodigoCapturado(termoDigitado) {
    if (!termoDigitado || termoDigitado.length < 1) return;

    console.log(`PDV-VS: Processando termo [Origem: ${origemLeitor}] ->`, termoDigitado);
    
    if (listenerTecladoGlobal) {
        window.removeEventListener('keydown', listenerTecladoGlobal);
        listenerTecladoGlobal = null;
    }

    fecharLeitorCamera();

    if (origemLeitor === 'busca') {
        const termoLower = termoDigitado.toLowerCase();
        
        const produtoEncontrado = produtosCache.find(prod => {
            const codigoMatch = prod.codigo && prod.codigo.trim().toLowerCase() === termoLower;
            const nomeMatch = prod.nome && prod.nome.toLowerCase().includes(termoLower);
            return codigoMatch || nomeMatch;
        });

        if (produtoEncontrado) {
            tratarAdicaoProduto(produtoEncontrado);
        } else {
            alert(`PDV-VS: Nenhum produto correspondente a "${termoDigitado}" foi encontrado.`);
        }
    } else if (origemLeitor === 'admin') {
        const inputCodigo = document.getElementById('formCodigo');
        if (inputCodigo) {
            inputCodigo.value = termoDigitado;
            inputCodigo.focus();
            inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
            inputCodigo.dispatchEvent(new Event('change', { bubbles: true }));
            console.log("PDV-VS Admin: Campo #formCodigo preenchido com sucesso.");
        } else {
            console.error("PDV-VS Admin: Elemento #formCodigo não encontrado.");
            alert(`Código capturado: ${termoDigitado}`);
        }
    }
}

export async function iniciarCameraComHtml5Qrcode() {
    try {
        if (html5QrcodeInstance) {
            try {
                if (html5QrcodeInstance.isScanning) {
                    await html5QrcodeInstance.stop();
                }
            } catch (e) {
                console.warn("Aviso ao limpar instância anterior:", e);
            }
            setHtml5QrcodeInstance(null);
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        const elementId = "videoPreviewCamera";
        const container = document.getElementById(elementId);
        if (!container) {
            console.error("PDV-VS: Elemento #videoPreviewCamera não encontrado no DOM.");
            return;
        }

        const QrLib = window.Html5Qrcode;
        if (!QrLib) {
            console.error("PDV-VS: Biblioteca Html5Qrcode não encontrada no escopo global.");
            return;
        }

        const instance = new QrLib(elementId);
        setHtml5QrcodeInstance(instance);
        
        const config = { 
            fps: 25,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        };
        
        const cameraConfig = { 
            facingMode: "environment" 
        };

        await instance.start(
            cameraConfig,
            config,
            (decodedText) => {
                if (!decodedText) return;
                processarCodigoCaptured(decodedText.trim());
            },
            (errorMessage) => {
                // Ignora ruídos de frame
            }
        );
    } catch (err) {
        console.error("PDV-VS Erro ao iniciar câmera:", err);
    }
}

export async function fecharLeitorCamera() {
    if (listenerTecladoGlobal) {
        window.removeEventListener('keydown', listenerTecladoGlobal);
        listenerTecladoGlobal = null;
    }

    if (html5QrcodeInstance) {
        try {
            if (html5QrcodeInstance.isScanning) {
                await html5QrcodeInstance.stop();
            }
        } catch(e) {
            console.error("PDV-VS Erro ao parar câmera:", e);
        }
        setHtml5QrcodeInstance(null);
    }
    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
}

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;