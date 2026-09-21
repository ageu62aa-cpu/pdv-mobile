// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

// Variável para gerenciar o buffer global de pistolas USB/Bluetooth com segurança
let listenerTecladoGlobal = null;

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
            containerManual.style.cssText = "margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; gap: 8px; align-items: center; width: 100%; box-sizing: border-box; z-index: 100000; position: relative;";
            
            containerManual.innerHTML = `
                <input type="text" id="inputCodigoManual" placeholder="Digite o código ou use a pistola / câmera..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none; background: #fff; color: #000;" />
                <button type="button" id="btnConfirmarManual" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
            `;
            cardModal.appendChild(containerManual);

            // Evento direto no botão OK (Captura manual e envia para a aba/janela correta)
            const btn = document.getElementById('btnConfirmarManual');
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                executarEntradaManual();
            };

            // Evento de tecla Enter no input manual
            const inp = document.getElementById('inputCodigoManual');
            inp.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    executarEntradaManual();
                }
            };
        }
        
        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.value = '';
            setTimeout(() => inp.focus(), 150);
        }

        // ==========================================
        // SUPORTE PROFISSIONAL PARA PISTOLA USB / BLUETOOTH
        // ==========================================
        if (listenerTecladoGlobal) {
            window.removeEventListener('keydown', listenerTecladoGlobal);
        }

        let bufferLeitor = '';
        let ultimoTempo = Date.now();

        listenerTecladoGlobal = (e) => {
            const tempoAtual = Date.now();
            const modalEstaAtivo = modalCam && !modalCam.classList.contains('hidden');

            if (!modalEstaAtivo) return;

            // Pistolas de código de barras digitam muito rápido (< 100ms entre caracteres)
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
                
                // Se o usuário estiver digitando e o foco não estiver no input, joga os caracteres lá para feedback visual
                if (document.activeElement !== inp && inp) {
                    inp.value += e.key;
                }
            }
        };

        window.addEventListener('keydown', listenerTecladoGlobal);
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
    
    // Remove o listener global para evitar duplicações ao fechar
    if (listenerTecladoGlobal) {
        window.removeEventListener('keydown', listenerTecladoGlobal);
        listenerTecladoGlobal = null;
    }

    // Fecha o modal da câmera e limpa instâncias
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
        // Injeta o valor de forma limpa na aba/janela ao lado (Admin)
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
                processarCodigoCapturado(decodedText.trim());
            },
            (errorMessage) => {
                // Ignora ruídos de frame da leitura por câmera
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