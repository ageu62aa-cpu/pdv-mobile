// ==========================================
// MÓDULO DE LEITOR DE CÂMERA NATIVO (PDV-VS)
// ==========================================

import { 
    origemLeitor, setOrigemLeitor, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

export async function abrirLeitorCamera() {
    console.log("PDV-VS: Abrindo leitor nativo para Vendas (busca)");
    setOrigemLeitor('busca');
    dispararSeletorCameraNativo();
}

export async function escanearCameraAdmin() {
    console.log("PDV-VS: Abrindo leitor nativo para Admin");
    setOrigemLeitor('admin');
    dispararSeletorCameraNativo();
}

function dispararSeletorCameraNativo() {
    // Remove input anterior se existir
    let inputAntigo = document.getElementById('inputCameraNativoOculto');
    if (inputAntigo) inputAntigo.remove();

    // Cria um input file oculto configurado estritamente para abrir a câmera traseira
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.id = 'inputCameraNativoOculto';
    inputFile.accept = 'image/*';
    inputFile.setAttribute('capture', 'environment');
    inputFile.style.display = 'none';

    inputFile.onchange = async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        console.log("PDV-VS: Imagem capturada pela câmera nativa, processando...");

        try {
            // Usa o decodificador estático da biblioteca em cima da foto nativa de alta qualidade
            const qrScanner = new window.Html5Qrcode("modalCamera") || new window.Html5Qrcode("tempScannerDiv");
            const codigoLido = await qrScanner.scanFile(arquivo, true);

            if (codigoLido) {
                console.log("PDV-VS: Código lido com sucesso pela câmera nativa:", codigoLido);
                processarCodigoCapturado(codigoLido.trim());
            } else {
                alert("Não foi possível identificar o código de barras na foto. Tente novamente aproximando mais.");
            }
        } catch (err) {
            console.error("PDV-VS Erro ao decodificar imagem nativa:", err);
            // Se falhar na leitura automática da foto, abre o modal de digitação manual para garantir que o fluxo não trave
            abrirModalFallbackManual();
        }
    };

    document.body.appendChild(inputFile);
    inputFile.click();
}

function abrirModalFallbackManual() {
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
            containerManual.style.cssText = "margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box;";
            
            containerManual.innerHTML = `
                <span style="font-size: 11px; color: #dc2626; font-weight: 600;">A foto não foi lida automaticamente. Digite o código abaixo:</span>
                <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                    <input type="text" id="inputCodigoManual" placeholder="Digite o código..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none; background: #fff; color: #000;" />
                    <button type="button" id="btnConfirmarManual" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
                </div>
            `;
            cardModal.appendChild(containerManual);

            document.getElementById('btnConfirmarManual').onclick = (e) => {
                e.preventDefault();
                executarEntradaManual();
            };

            document.getElementById('inputCodigoManual').onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executarEntradaManual();
                }
            };
        }
        setTimeout(() => {
            const inp = document.getElementById('inputCodigoManual');
            if (inp) { inp.value = ''; inp.focus(); }
        }, 150);
    }
}

function executarEntradaManual() {
    const inp = document.getElementById('inputCodigoManual');
    if (!inp) return;
    const valorDigitado = inp.value.trim();
    if (valorDigitado.length > 0) {
        processarCodigoCapturado(valorDigitado);
    } else {
        inp.focus();
    }
}

function processarCodigoCapturado(termoDigitado) {
    if (!termoDigitado || termoDigitado.length < 1) return;

    console.log(`PDV-VS: Processando termo [Origem: ${origemLeitor}] ->`, termoDigitado);
    
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
        } else {
            alert(`Código capturado: ${termoDigitado}`);
        }
    }
}

export async function fecharLeitorCamera() {
    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
    let inputAntigo = document.getElementById('inputCameraNativoOculto');
    if (inputAntigo) inputAntigo.remove();
}

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;