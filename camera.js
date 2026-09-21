// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;
let ultimaFotoCapturadaArquivo = null;

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

        const cardModal = modalCam.querySelector('div') || modalCam;
        cardModal.style.position = cardModal.style.position || 'relative';

        // Botão flutuante de Fechar/Voltar absoluto no topo
        let btnFlutuanteSair = document.getElementById('btnFlutuanteSairCamera');
        if (!btnFlutuanteSair) {
            btnFlutuanteSair = document.createElement('button');
            btnFlutuanteSair.id = 'btnFlutuanteSairCamera';
            btnFlutuanteSair.type = 'button';
            btnFlutuanteSair.innerHTML = '✕ Fechar / Voltar';
            btnFlutuanteSair.style.cssText = "position: absolute; top: 10px; right: 10px; background: #ef4444; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; z-index: 100002; box-shadow: 0 2px 5px rgba(0,0,0,0.3);";
            
            btnFlutuanteSair.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                fecharLeitorCamera();
            };
            cardModal.appendChild(btnFlutuanteSair);
        }

        let containerManual = document.getElementById('containerManualCamera');
        if (!containerManual) {
            containerManual = document.createElement('div');
            containerManual.id = 'containerManualCamera';
            containerManual.style.cssText = "margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; z-index: 100000; position: relative;";
            
            containerManual.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
                    <span id="statusFotoLabel" style="font-size: 11px; color: #64748b; font-weight: 500;">Câmera ao vivo ativa:</span>
                    <button type="button" id="btnCapturarNativo" style="background: #0ea5e9; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center;">
                        📸 Tirar Foto para Leitura Automática
                    </button>
                </div>

                <div style="display: none;">
                    <input type="text" id="inputCodigoManual" />
                    <button type="button" id="btnConfirmarManual">OK</button>
                </div>
            `;
            cardModal.appendChild(containerManual);

            const btnNativo = document.getElementById('btnCapturarNativo');
            btnNativo.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                dispararCameraParaCaptura();
            };
        }
        
        ultimaFotoCapturadaArquivo = null;
        const statusLbl = document.getElementById('statusFotoLabel');
        if (statusLbl) statusLbl.innerText = "Câmera ao vivo ativa:";

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

function dispararCameraParaCaptura() {
    let inputAntigo = document.getElementById('inputCameraNativoOculto');
    if (inputAntigo) inputAntigo.remove();

    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.id = 'inputCameraNativoOculto';
    inputFile.accept = 'image/*';
    inputFile.setAttribute('capture', 'environment');
    inputFile.style.display = 'none';

    inputFile.onchange = async (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
            html5QrcodeInstance.stop().catch(() => {});
        }

        ultimaFotoCapturadaArquivo = arquivo;
        console.log("PDV-VS: Foto capturada. Executando leitura automática na imagem...");

        const statusLbl = document.getElementById('statusFotoLabel');
        if (statusLbl) statusLbl.innerText = "Lendo código da foto automaticamente...";

        const containerVideo = document.getElementById('videoPreviewCamera');
        if (containerVideo) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                containerVideo.innerHTML = `<div style="width:100%; height:100%; background:url('${evt.target.result}') center/contain no-repeat; background-color: #000; display: flex; align-items: center; justify-content: center;">
                    <div style="background: rgba(0,0,0,0.8); color: #fff; padding: 10px 15px; font-size: 13px; border-radius: 8px; font-weight: bold;">Processando imagem...</div>
                </div>`;
            };
            reader.readAsDataURL(arquivo);
        }

        if (inputFile) inputFile.remove();

        // Dispara o escaneamento automático imediato na foto estática tirada
        setTimeout(async () => {
            await executarScanAutomaticoNaFoto(arquivo);
        }, 300);
    };

    document.body.appendChild(inputFile);
    inputFile.click();
}

async function executarScanAutomaticoNaFoto(arquivoFoto) {
    try {
        const qrScanner = new window.Html5Qrcode("modalCamera") || new window.Html5Qrcode("videoPreviewCamera");
        let codigoLido = null;

        // Tenta ler o código de barras/QR Code de forma estática na imagem capturada
        try {
            codigoLido = await qrScanner.scanFile(arquivoFoto, true);
        } catch (errScan) {
            console.warn("Tentativa padrão de scanFile falhou:", errScan);
        }

        if (codigoLido) {
            console.log("PDV-VS: Código detectado com sucesso na foto:", codigoLido);
            processarCodigoCapturado(codigoLido.trim());
        } else {
            // Fallback inteligente: se a biblioteca não achar por ser foto comum, tenta ler o nome do arquivo ou exibe aviso rápido
            console.warn("PDV-VS: Nenhum código de barras padronizado detectado na foto.");
            alert("Não foi possível detectar o código de barras automaticamente nesta foto. Tente centralizar melhor o código na próxima tentativa.");
            fecharLeitorCamera();
        }
    } catch (err) {
        console.error("PDV-VS Erro no processamento automático da foto:", err);
        alert("Erro ao processar a imagem.");
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
            alert(`PDV-VS: Código "${termoDigitado}" lido, mas nenhum produto correspondente foi encontrado.`);
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

    let inputAntigo = document.getElementById('inputCameraNativoOculto');
    if (inputAntigo) inputAntigo.remove();

    ultimaFotoCapturadaArquivo = null;

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