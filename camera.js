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
        
        // Configuração exata para moldura retangular centrada com foco restrito (evita leituras erradas no iPhone)
        const config = { 
            fps: 30, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                // Dimensões proporcionais rigorosas para códigos de barras lineares e QR Codes
                let width = Math.floor(viewfinderWidth * 0.80);
                let height = Math.floor(width * 0.40); 
                return { width: width, height: height };
            },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
        };
        
        // Força a utilização da câmara traseira com optimização para leitura de códigos
        const cameraConfig = { 
            facingMode: "environment"
        };

        await instance.start(
            cameraConfig,
            config,
            (decodedText) => {
                fecharLeitorCamera();
                
                if (origemLeitor === 'busca') {
                    const p = produtosCache.find(prod => (prod.codigo && prod.codigo.trim() === decodedText.trim()) || prod.nome.toLowerCase().includes(decodedText.toLowerCase()));
                    if (p) { 
                        tratarAdicaoProduto(p); 
                    } else { 
                        alert(`PDV-VS: Código lido (${decodedText}), mas nenhum produto correspondente foi encontrado.`); 
                    }
                } else if (origemLeitor === 'admin') {
                    const inputCodigo = document.getElementById('formCodigo');
                    if (inputCodigo) {
                        inputCodigo.value = decodedText;
                        inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            },
            (errorMessage) => {
                // Ignora erros de frame enquanto aguarda o código de barras alinhar na moldura
            }
        );
    } catch (err) {
        console.error("PDV-VS Erro ao iniciar câmera:", err);
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