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
        modalCam.style.zIndex = "99999"; // Garante prioridade máxima na tela de vendas
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');
    }
    await iniciarCameraComHtml5Qrcode();
}

export async function escanearCameraAdmin() {
    setOrigemLeitor('admin');
    
    // Oculta temporariamente o modal do painel/produto para a câmara assumir o foco limpo sem conflito de camadas
    const modalAdmin = document.querySelector('.modal-produto, #modalGerenciarProduto, .fixed.inset-0.bg-black\\/60'); 
    const modalCam = document.getElementById('modalCamera');
    
    if (modalCam) {
        modalCam.style.zIndex = "99999"; // Fica acima de tudo
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
        
        // Configuração ajustada para calcular dinamicamente e centralizar perfeitamente o retângulo no iOS e Android
        const config = { 
            fps: 30, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                let width = Math.floor(viewfinderWidth * 0.85);
                let height = Math.floor(width * 0.38); // Proporção exata e otimizada para códigos de barras
                return { width: width, height: height };
            },
            aspectRatio: 1.333334 // Mantém proporção estável e evita deslocamento da moldura para baixo no Safari
        };
        
        const cameraConfig = { facingMode: "environment" };

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
                    // Preenche o campo de código de barras no formulário do admin
                    const inputCodigo = document.getElementById('formCodigo');
                    if (inputCodigo) {
                        inputCodigo.value = decodedText;
                        // Dispara evento de input para atualizar eventuais estados reativos do formulário
                        inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            },
            (errorMessage) => {
                // Ignora erros de leitura quadro a quadro
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