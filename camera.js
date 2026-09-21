// ==========================================
// MÓDULO DE LEITOR DE CÂMERA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;
let ultimaFotoCapturadaArquivo = null; // Guarda o arquivo binário para leitura interna

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
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px;">
                    <span id="statusFotoLabel" style="font-size: 11px; color: #64748b; font-weight: 500;">Câmera ao vivo ativa:</span>
                    <button type="button" id="btnCapturarNativo" style="background: #0ea5e9; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 4px;">
                        📸 Tirar Foto
                    </button>
                </div>

                <div style="display: flex; gap: 8px; width: 100%; align-items: center;">
                    <input type="text" id="inputCodigoManual" placeholder="Digite o código ou tire a foto..." style="flex: 1; padding: 10px; border: 1px solid #94a3b8; border-radius: 6px; font-size: 14px; outline: none; background: #fff; color: #000;" />
                    <button type="button" id="btnConfirmarManual" style="background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">OK</button>
                </div>
            `;
            cardModal.appendChild(containerManual);

            const btnNativo = document.getElementById('btnCapturarNativo');
            btnNativo.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                dispararCameraParaCaptura();
            };

            const btn = document.getElementById('btnConfirmarManual');
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                executarBotaoOkOuManual();
            };

            const inp = document.getElementById('inputCodigoManual');
            inp.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    executarBotaoOkOuManual();
                }
            };
        }
        
        ultimaFotoCapturadaArquivo = null;
        const statusLbl = document.getElementById('statusFotoLabel');
        if (statusLbl) statusLbl.innerText = "Câmera ao vivo ativa:";

        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.value = '';
            setTimeout(() => inp.focus(), 150);
        }

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

function dispararCameraParaCaptura() {
    let inputAntigo = document.getElementById('inputCameraNativoOculto');
    if (inputAntigo) inputAntigo.remove();

    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.id = 'inputCameraNativoOculto';
    inputFile.accept = 'image/*';
    inputFile.setAttribute('capture', 'environment');
    inputFile.style.display = 'none';

    inputFile.onchange = (e) => {
        const arquivo = e.target.files[0];
        if (!arquivo) return;

        // Para a câmera ao vivo se estiver rodando para economizar processamento
        if (html5QrcodeInstance && html5QrcodeInstance.isScanning) {
            html5QrcodeInstance.stop().catch(() => {});
        }

        ultimaFotoCapturadaArquivo = arquivo;
        console.log("PDV-VS: Foto capturada e fixada na tela. Pronto para leitura interna.");

        // Exibe a foto estaticamente na mesma moldura da câmera
        const containerVideo = document.getElementById('videoPreviewCamera');
        if (containerVideo) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                containerVideo.innerHTML = `<div style="width:100%; height:100%; background:url('${evt.target.result}') center/contain no-repeat; background-color: #000;"></div>`;
            };
            reader.readAsDataURL(arquivo);
        }

        const statusLbl = document.getElementById('statusFotoLabel');
        if (statusLbl) statusLbl.innerText = "Foto na tela! Clique em OK para extrair o código:";

        const inp = document.getElementById('inputCodigoManual');
        if (inp) {
            inp.placeholder = "Pressione OK para ler a imagem...";
            inp.focus();
        }

        if (inputFile) inputFile.remove();
    };

    document.body.appendChild(inputFile);
    inputFile.click();
}

async function executarBotaoOkOuManual() {
    // Se houver uma foto armazenada, faz a leitura interna (escaneamento sobreposto) sem reabrir imagens
    if (ultimaFotoCapturadaArquivo) {
        console.log("PDV-VS: Executando escaneamento interno sobre a foto...");
        try {
            const qrScanner = new window.Html5Qrcode("modalCamera") || new window.Html5Qrcode("videoPreviewCamera");
            let codigoLido = null;
            try {
                codigoLido = await qrScanner.scanFile(ultimaFotoCapturadaArquivo, true);
            } catch (errScan) {
                console.warn("Leitura direta do arquivo falhou:", errScan);
            }

            if (codigoLido) {
                console.log("PDV-VS: Código extraído com sucesso da foto fixa:", codigoLido);
                processarCodigoCapturado(codigoLido.trim());
                return;
            } else {
                console.warn("PDV-VS: Não foi possível decodificar barras desta foto. Focando no campo manual.");
                const inp = document.getElementById('inputCodigoManual');
                if (inp) {
                    inp.placeholder = "Não lido. Digite o código aqui...";
                    inp.focus();
                }
                ultimaFotoCapturadaArquivo =pperware = null; // reseta para permitir digitar
            }
        } catch (err) {
            console.error("PDV-VS Erro ao escanear arquivo:", err);
        }
        return;
    }

    // Caso contrário, segue o fluxo normal de texto digitado ou pistola
    executarEntradaManual();
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