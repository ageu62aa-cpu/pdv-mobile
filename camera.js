// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS) - BLINDADO PARA iOS
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;

export async function abrirLeitorCamera() {
    console.log("PDV-VS: Abrindo leitor automático para Vendas (busca)");
    setOrigemLeitor('busca');
    prepararModalCameraVisual();
    await iniciarCameraComHtml5Qrcode();
}

export async function escanearCameraAdmin() {
    console.log("PDV-VS: Abrindo leitor automático para Admin");
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

        // Limpeza preventiva de elementos visuais legados
        const containerManual = document.getElementById('containerManualCamera');
        if (containerManual) containerManual.remove();

        const btnFlutuanteSair = document.getElementById('btnFlutuanteSairCamera');
        if (btnFlutuanteSair) btnFlutuanteSair.remove();

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
            }
        };

        window.addEventListener('keydown', listenerTecladoGlobal);
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
        
        // Configuração de quadros e moldura otimizada para leitura rápida
        const config = { 
            fps: 25,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        };

        let cameraIdParaUso = { facingMode: "environment" };

        // TRUQUE DEFINITIVO PARA iOS: Tenta mapear as câmeras físicas reais do aparelho
        try {
            const devices = await QrLib.getCameras();
            if (devices && devices.length > 0) {
                console.log("PDV-VS: Câmeras detectadas:", devices);
                // Busca preferencialmente por uma câmera traseira (back, rear, environment)
                const cameraTraseira = devices.find(device => {
                    const label = device.label.toLowerCase();
                    return label.includes('back') || label.includes('traseira') || label.includes('rear') || label.includes('environment');
                });

                if (cameraTraseira) {
                    cameraIdParaUso = cameraTraseira.id;
                    console.log("PDV-VS: Usando ID específico da câmera traseira:", cameraTraseira.label);
                } else {
                    // Se não achar pelo rótulo, pega a última da lista (geralmente a principal traseira em iPhones com múltiplas lentes)
                    cameraIdParaUso = devices[devices.length - 1].id;
                }
            }
        } catch (errCamList) {
            console.warn("PDV-VS: Não foi possível enumerar câmeras via getCameras, usando fallback facingMode.", errCamList);
        }

        // Força constraints avançadas de resolução e foco adaptadas para o WebKit/Safari do iOS
        const constraintsAvancadas = typeof cameraIdParaUso === 'string' 
            ? { deviceId: { exact: cameraIdParaUso }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } };

        await instance.start(
            constraintsAvancadas,
            config,
            (decodedText) => {
                if (!decodedText) return;
                console.log("PDV-VS: Código escaneado com sucesso:", decodedText);
                processarCodigoCapturado(decodedText.trim());
            },
            (errorMessage) => {
                // Silencia os erros de varredura frame a frame vazios
            }
        );
    } catch (err) {
        console.error("PDV-VS Erro crítico ao iniciar câmera no iOS/Dispositivo:", err);
        alert("Erro ao acessar a câmera. Certifique-se de permitir o uso da câmera nas configurações do seu navegador/iPhone.");
        fecharLeitorCamera();
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
            console.warn(`PDV-VS: Código "${termoDigitado}" lido, mas produto não encontrado no cache.`);
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
        }
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