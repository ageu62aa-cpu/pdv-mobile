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
        
        // Configuração com caixa centralizada restrita e formatos essenciais limpos
        const config = { 
            fps: 20, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                let width = Math.floor(viewfinderWidth * 0.75);
                let height = Math.floor(width * 0.40); 
                return { width: width, height: height };
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.UPC_A
            ]
        };
        
        // Configuração avançada de mídia compatível com WebKit do iOS para evitar desfoque
        const cameraConfig = { 
            facingMode: "environment",
            advanced: [{ focusMode: "continuous" }]
        };

        await instance.start(
            cameraConfig,
            config,
            (decodedText) => {
                if (!decodedText) return;
                const codigoLimpo = decodedText.trim();

                // Validação rigorosa de tamanho para evitar falsos positivos
                if (codigoLimpo.length < 4) return;

                fecharLeitorCamera();

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
                // Ignora ruídos de varredura
            }
        );
    } catch (err) {
        console.warn("Tentando fallback de câmara sem foco avançado para compatibilidade com iOS antigo...");
        try {
            // Fallback caso o Safari rejeite o parâmetro advanced de foco
            if (html5QrcodeInstance) {
                await html5QrcodeInstance.start(
                    { facingMode: "environment" },
                    { fps: 15, qrbox: { width: 250, height: 100 } },
                    (decodedText) => {
                        if (!decodedText || decodedText.trim().length < 4) return;
                        fecharLeitorCamera();
                        const codigoLimpo = decodedText.trim();
                        if (origemLeitor === 'busca') {
                            const p = produtosCache.find(prod => prod.codigo === codigoLimpo);
                            if (p) tratarAdicaoProduto(p);
                        } else if (origemLeitor === 'admin') {
                            const inputCodigo = document.getElementById('formCodigo');
                            if (inputCodigo) {
                                inputCodigo.value = codigoLimpo;
                                inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    },
                    () => {}
                );
                return;
            }
        } catch (fallbackErr) {
            console.error("Erro crítico no fallback da câmera:", fallbackErr);
        }

        alert("PDV-VS: Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo nas configurações do seu navegador.");
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