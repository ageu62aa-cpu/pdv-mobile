// ==========================================
// MÓDULO DE LEITOR DE CÂMERA E PISTOLA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;

// Inicializa o listener global da pistola de código de barras física / teclado (PC e Web)
export function inicializarLeitorTecladoPistola() {
    if (listenerTecladoGlobal) return;

    let bufferLeitor = '';
    let ultimoTempo = Date.now();

    listenerTecladoGlobal = (e) => {
        const tempoAtual = Date.now();

        const modalCam = document.getElementById('modalCamera');
        if (modalCam && !modalCam.classList.contains('hidden')) return;

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
                processarCodigoCapturadoUniversal(codigoLido);
            }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            bufferLeitor += e.key;
        }
    };

    window.addEventListener('keydown', listenerTecladoGlobal);
}

// Executado ao abrir leitor para Vendas
export async function abrirLeitorCamera() {
    console.log("PDV-VS: Abrindo leitor para Vendas");
    setOrigemLeitor('busca');
    await dispararLeitorDispositivo();
}

// Executado ao abrir leitor no Admin
export async function escanearCameraAdmin() {
    console.log("PDV-VS: Abrindo leitor para Admin");
    setOrigemLeitor('admin');
    await dispararLeitorDispositivo();
}

// Utiliza o motor visual customizável Html5Qrcode no Capacitor (com controle total da moldura)
async function dispararLeitorDispositivo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        // Se estiver no ambiente nativo, garante a permissão de hardware da câmera primeiro
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            const BarcodeScannerPlugin = window.Capacitor.Plugins.BarcodeScanner;
            try {
                const sant = await BarcodeScannerPlugin.isSupported();
                if (sant.supported) {
                    const perm = await BarcodeScannerPlugin.requestPermissions();
                    if (perm.camera !== 'granted' && perm.camera !== 'limited') {
                        alert("Permissão de câmera negada nas configurações do seu dispositivo.");
                        return;
                    }
                }
            } catch (e) {
                console.warn("Aviso na checagem nativa de permissão:", e);
            }
        }

        // Abre o modal visual e inicia a leitura com controle customizado de moldura
        prepararModalCameraWeb();
        await iniciarCameraComHtml5Qrcode();

    } catch (err) {
        console.error("PDV-VS Erro ao acionar leitor do dispositivo:", err);
        await fecharLeitorCamera();
        
        const codigoManual = prompt("Não foi possível acessar a câmera automaticamente. Digite ou bipe o código:");
        if (codigoManual) processarCodigoCapturadoUniversal(codigoManual.trim());
    }
}

function prepararModalCameraWeb() {
    const modalCam = document.getElementById('modalCamera');
    if (modalCam) {
        modalCam.style.zIndex = "99999";
        modalCam.classList.add('flex');
        modalCam.classList.remove('hidden');
    }
}

export async function iniciarCameraComHtml5Qrcode() {
    try {
        if (html5QrcodeInstance) {
            try {
                if (html5QrcodeInstance.isScanning) await html5QrcodeInstance.stop();
            } catch (e) {}
            setHtml5QrcodeInstance(null);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const elementId = "videoPreviewCamera";
        const container = document.getElementById(elementId);
        if (!container) return;

        const QrLib = window.Html5Qrcode;
        if (!QrLib) {
            alert("Biblioteca de leitura web não carregada.");
            return;
        }

        const instance = new QrLib(elementId);
        setHtml5QrcodeInstance(instance);
        
        // Moldura ajustada para leitura otimizada (você pode alterar width e height se precisar de um leitor mais largo ou estreito)
        await instance.start(
            { facingMode: "environment" },
            { 
                fps: 30, 
                qrbox: { width: 300, height: 150 }, // Moldura controlada: ideal para abranger códigos médios e pequenos com precisão
                aspectRatio: 1.777778 
            },
            (decodedText) => {
                if (!decodedText) return;
                fecharLeitorCamera();
                processarCodigoCapturadoUniversal(decodedText.trim());
            },
            () => {}
        );
    } catch (err) {
        console.error("PDV-VS Erro Html5Qrcode:", err);
        fecharLeitorCamera();
    }
}

function processarCodigoCapturadoUniversal(termoDigitado) {
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
            const inputBusca = document.getElementById('inputBusca');
            if (inputBusca) {
                inputBusca.value = termoDigitado;
                inputBusca.focus();
                inputBusca.dispatchEvent(new Event('input', { bubbles: true }));
                inputBusca.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } else if (origemLeitor === 'admin') {
        const inputCodigo = document.getElementById('formCodigo');
        if (inputCodigo) {
            inputCodigo.value = termoDigitado;
            inputCodigo.focus();
            inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));
            inputCodigo.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

export async function fecharLeitorCamera() {
    if (html5QrcodeInstance) {
        try {
            if (html5QrcodeInstance.isScanning) await html5QrcodeInstance.stop();
        } catch(e) {}
        setHtml5QrcodeInstance(null);
    }
    
    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
}

inicializarLeitorTecladoPistola();

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;