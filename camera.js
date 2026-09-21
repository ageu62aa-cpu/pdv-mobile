// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;
let ultimaImagemCapturadaBlob = null; // Armazena o último frame capturado para análise inteligente

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
                <!-- Botão de câmera discreto para capturar e congelar o frame -->
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
                    <span id="statusCapturaFeedback" style="font-size: 11px; color: #64748b; font-weight: 500;">Aponte para o código e clique em capturar se necessário</span>
                    <button type="button" id="btnCapturarMolduraOtimizada" title="Capturar imagem da moldura" style="background: #1e293b; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 12px; transition: background 0.2s;">
                        📷 Capturar Frame
                    </button>
                </div>

                <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                    <input type="text" id="inputCodigoManual" placeholder="Digite o código ou capture o frame..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none; background: #fff; color: #000;" />
                    <button type="button" id="btnConfirmarManual" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
                </div>
            `;
            cardModal.appendChild(containerManual);

            // Evento do botão de captura
            const btnCapturar = document.getElementById('btnCapturarMolduraOtimizada');
            btnCapturar.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await capturarEArmazenarMoldura();
            };

            // Evento do botão OK inteligente
            const btn = document.getElementById('btnConfirmarManual');
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await executarAcaoInteligentemente();
            };

            const inp = document.getElementById('inputCodigoManual');
            inp.onkeydown = async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    await executarAcaoInteligentemente();
                }
            };
        }
        
        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.value = '';
            ultimaImagemCapturadaBlob = null;
            setTimeout(() => inp.focus(), 150);
        }

        const lblFeedback = document.getElementById('statusCapturaFeedback');
        if (lblFeedback) lblFeedback.innerText = "Aponte para o código e clique em capturar se necessário";

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

// Captura o frame atual da moldura e guarda na memória para o botão OK processar
async function capturarEArmazenarMoldura() {
    try {
        const videoElement = document.querySelector('#videoPreviewCamera video');
        const lblFeedback = document.getElementById('statusCapturaFeedback');
        if (!videoElement) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            ultimaImagemCapturadaBlob = blob;

            if (lblFeedback) {
                lblFeedback.innerText = "✅ Frame capturado! Processando...";
                lblFeedback.style.color = "#16a34a";
            }

            // Tenta decodificar imediatamente o blob capturado
            const arquivo = new File([blob], "codigo_capturado.png", { type: "image/png" });
            try {
                const scannerTemp = new window.Html5Qrcode("videoPreviewCamera");
                const codigoDecodificado = await scannerTemp.scanFile(arquivo, true);
                if (codigoDecodificado) {
                    processarCodigoCapturado(codigoDecodificado.trim());
                    return;
                }
            } catch (err) {
                // Silencia erro e deixa pronto para o OK forçar ou o usuário digitar
            }

            const inp = document.getElementById('inputCodigoManual');
            if (inp) inp.focus();
            if (lblFeedback) {
                lblFeedback.innerText = "📸 Frame salvo. Clique OK para forçar leitura ou digite.";
            }
        }, 'image/png');

    } catch (e) {
        console.error("Erro ao capturar moldura:", e);
    }
}

// Ação inteligente do botão OK: verifica se há texto digitado ou tenta extrair da imagem capturada por último
async function executarAcaoInteligentemente() {
    const inp = document.getElementById('inputCodigoManual');
    if (!inp) return;

    const valorDigitado = inp.value.trim();

    // 1. Se o usuário digitou algo, usa o texto digitado imediatamente
    if (valorDigitado.length > 0) {
        processarCodigoCapturado(valorDigitado);
        return;
    }

    // 2. Se o campo está vazio mas existe uma imagem capturada, força nova varredura profunda no blob
    if (ultimaImagemCapturadaBlob) {
        const lblFeedback = document.getElementById('statusCapturaFeedback');
        if (lblFeedback) lblFeedback.innerText = "🔍 Forçando leitura da imagem capturada...";

        try {
            const arquivo = new File([ultimaImagemCapturadaBlob], "codigo_capturado.png", { type: "image/png" });
            const scannerTemp = new window.Html5Qrcode("videoPreviewCamera");
            const codigoDecodificado = await scannerTemp.scanFile(arquivo, true);

            if (codigoDecodificado) {
                processarCodigoCapturado(codigoDecodificado.trim());
                return;
            }
        } catch (e) {
            console.warn("Tentativa final de scanFile falhou:", e);
        }

        if (lblFeedback) {
            lblFeedback.innerText = "⚠️ Não foi possível ler automaticamente. Digite o código.";
            lblFeedback.style.color = "#dc2626";
        }
        inp.focus();
    } else {
        // Se não tem imagem nem texto, avisa e foca
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
                processarCodigoCapturado(decodedText.trim());
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