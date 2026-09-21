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
    prepararModalCameraVisual();
    await iniciarCameraComHtml5Qrcode();
}

export async function escanearCameraAdmin() {
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

        // Garante que o painel de entrada manual esteja presente e acessível em qualquer modo
        let containerManual = document.getElementById('containerManualCamera');
        if (!containerManual) {
            const cardModal = modalCam.querySelector('div') || modalCam;
            containerManual = document.createElement('div');
            containerManual.id = 'containerManualCamera';
            containerManual.style.cssText = "margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; gap: 8px; align-items: center; width: 100%; box-sizing: border-box;";
            
            containerManual.innerHTML = `
                <input type="text" id="inputCodigoManual" placeholder="Digite o código ou nome do produto..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none;" />
                <button type="button" id="btnConfirmarManual" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
            `;
            cardModal.appendChild(containerManual);

            // Ação ao clicar no botão OK
            document.getElementById('btnConfirmarManual').addEventListener('click', () => {
                const val = document.getElementById('inputCodigoManual').value.trim();
                if (val) processarCodigoLido(val);
            });

            // Ação ao pressionar Enter no teclado/celular
            document.getElementById('inputCodigoManual').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = e.target.value.trim();
                    if (val) processarCodigoLido(val);
                }
            });
        }
        
        // Limpa o campo sempre que abrir o modal
        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.value = '';
            setTimeout(() => inp.focus(), 100); // Foca automaticamente no campo para agilizar a digitação se necessário
        }
    }
}

function processarCodigoLido(codigoLimpo) {
    if (!codigoLimpo || codigoLimpo.length < 2) return;

    fecharLeitorCamera();

    if (origemLeitor === 'busca') {
        const p = produtosCache.find(prod => (prod.codigo && prod.codigo.trim() === codigoLimpo) || prod.nome.toLowerCase().includes(codigoLimpo.toLowerCase()));
        if (p) { 
            tratarAdicaoProduto(p); 
        } else { 
            alert(`PDV-VS: Código "${codigoLimpo}" não foi encontrado no sistema.`); 
        }
    } else if (origemLeitor === 'admin') {
        const inputCodigo = document.getElementById('formCodigo');
        if (inputCodigo) {
            inputCodigo.value = codigoLimpo;
            inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
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

        const instance = new Html5Qrcode(elementId);
        setHtml5QrcodeInstance(instance);
        
        const config = { 
            fps: 20,
            qrbox: { width: 260, height: 150 },
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
                processarCodigoLido(decodedText.trim());
            },
            (errorMessage) => {
                // Ignora erros de frame iterativos
            }
        );
    } catch (err) {
        console.error("PDV-VS Erro ao iniciar câmera:", err);
    }
}

export async function fecharLeitorCamera() {
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