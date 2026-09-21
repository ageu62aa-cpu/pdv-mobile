// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

export async function abrirLeitorCamera() {
    setOrigemLeitor('busca');
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) {
        modalCam.style.zIndex = "99999";
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');
    }
    await iniciarCameraComHtml5Qrcode();
}

export async function escanearCameraAdmin() {
    setOrigemLeitor('admin');
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) {
        modalCam.style.zIndex = "99999";
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');
    }
    await iniciarCameraComHtml5Qrcode();
}

export async function iniciarCameraComHtml5Qrcode() {
    try {
        if (html5QrcodeInstance) {
            await html5QrcodeInstance.stop().catch(() => {});
            setHtml5QrcodeInstance(null);
        }
        
        const elementId = "videoPreviewCamera";
        const container = document.getElementById(elementId);
        if (!container) {
            console.error("PDV-VS: Elemento #videoPreviewCamera não encontrado no DOM.");
            return;
        }

        const instance = new Html5Qrcode(elementId);
        setHtml5QrcodeInstance(instance);
        
        // Configuração profissional otimizada para suportar QR Code e códigos de barras com alta precisão
        const config = { 
            fps: 30, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                // Moldura centralizada perfeitamente proporcional ao formato de barras e QR Codes
                let width = Math.floor(viewfinderWidth * 0.82);
                let height = Math.floor(width * 0.45); 
                return { width: width, height: height };
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            // Habilita explicitamente todos os formatos essenciais de PDV e QR Code
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        };
        
        // Configuração de câmara universal compatível com o WebKit do iPhone e Android
        const cameraConfig = { 
            facingMode: "environment" 
        };

        await instance.start(
            cameraConfig,
            config,
            (decodedText) => {
                // Validação de segurança para ignorar leituras vazias ou muito curtas/errôneas
                if (!decodedText || decodedText.trim().length < 2) return;

                fecharLeitorCamera();
                
                const codigoLimpo = decodedText.trim();

                if (origemLeitor === 'busca') {
                    const p = produtosCache.find(prod => (prod.codigo && prod.codigo.trim() === codigoLimpo) || prod.nome.toLowerCase().includes(codigoLimpo.toLowerCase()));
                    if (p) { 
                        tratarAdicaoProduto(p); 
                    } else { 
                        alert(`PDV-VS: Código lido (${codigoLimpo}), mas nenhum produto correspondente foi encontrado.`); 
                    }
                } else if (origemLeitor === 'admin') {
                    const inputCodigo = document.getElementById('formCodigo');
                    if (inputCodigo) {
                        inputCodigo.value = codigoLimpo;
                        inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            },
            (errorMessage) => {
                // Erros iterativos de varredura de frame são ignorados para manter a performance fluida
            }
        );
    } catch (err) {
        console.error("PDV-VS Erro ao iniciar câmera profissional:", err);
        alert("PDV-VS: Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo nas configurações do navegador e certifique-se de usar HTTPS.");
        fecharLeitorCamera();
    }
}

export async function fecharLeitorCamera() {
    if (html5QrcodeInstance) {
        try {
            await html5QrcodeInstance.stop();
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