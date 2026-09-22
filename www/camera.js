// ==========================================
// MÓDULO DE LEITOR DE CÂMERA E PISTOLA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

let listenerTecladoGlobal = null;

// Inicializa o listener global da pistola de código de barras física / teclado (PC e Web/USB/Bluetooth)
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

// Decide se usa o leitor nativo do Capacitor (iOS/Android) ou abre a modal Web (Fallback)
async function dispararLeitorDispositivo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            const BarcodeScannerPlugin = window.Capacitor.Plugins.BarcodeScanner;
            const plataforma = window.Capacitor.getPlatform(); 
            console.log(`PDV-VS: Plataforma nativa detectada -> ${plataforma}`);

            const sant = await BarcodeScannerPlugin.isSupported();
            if (sant.supported) {
                const perm = await BarcodeScannerPlugin.requestPermissions();
                
                if (perm.camera === 'granted' || perm.camera === 'limited') {
                    document.body.classList.add('barcode-scanner-active');
                    
                    if (plataforma === 'ios') {
                        document.documentElement.style.setProperty('--background', 'transparent');
                        try {
                            await BarcodeScannerPlugin.hideBackground();
                        } catch (e) {}
                    }

                    const resultado = await BarcodeScannerPlugin.scan({
                        lensFacing: "back"
                    });
                    
                    document.body.classList.remove('barcode-scanner-active');
                    if (plataforma === 'ios') {
                        document.documentElement.style.removeProperty('--background');
                        try {
                            await BarcodeScannerPlugin.showBackground();
                        } catch (e) {}
                    }

                    if (resultado && resultado.barcodes && resultado.barcodes.length > 0) {
                        const codigoLido = resultado.barcodes[0].displayValue || resultado.barcodes[0].rawValue;
                        if (codigoLido) {
                            setTimeout(() => {
                                processarCodigoCapturadoUniversal(codigoLido.trim());
                            }, 100);
                            return;
                        }
                    }
                    return;
                } else {
                    alert("Permissão de câmera negada nas configurações do seu dispositivo.");
                }
            }
        }

        // Se não for nativo (ou falhar/PWA web), usa o modal visual HTML5 padrão
        prepararModalCameraWeb();
        await iniciarCameraComHtml5Qrcode();

    } catch (err) {
        console.error("PDV-VS Erro ao acionar leitor do dispositivo:", err);
        document.body.classList.remove('barcode-scanner-active');
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
        if (!QrLib) return;

        const instance = new QrLib(elementId);
        setHtml5QrcodeInstance(instance);
        
        await instance.start(
            { facingMode: "environment" },
            { fps: 30, qrbox: { width: 280, height: 140 }, aspectRatio: 1.777778 },
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
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            await window.Capacitor.Plugins.BarcodeScanner.stopScan().catch(() => {});
            await window.Capacitor.Plugins.BarcodeScanner.showBackground().catch(() => {});
            document.body.classList.remove('barcode-scanner-active');
            document.documentElement.style.removeProperty('--background');
        }
    } catch(e) {}

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

// ---------------------------------------------------------
// COMPONENTES VISUAIS DE AVISO DE COMPATIBILIDADE (ADMIN)
// ---------------------------------------------------------
export function renderizarAvisosCompatibilidadeAdmin(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; gap: 15px; justify-content: center; margin: 15px 0; font-family: sans-serif;">
            <!-- iOS -->
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; text-align: center; width: 140px; background: #fafafa;">
                <span style="font-size: 24px;">🍏</span>
                <div style="font-weight: bold; margin: 5px 0; font-size: 14px;">iOS / iPhone</div>
                <div style="color: #d9534f; font-weight: bold; font-size: 12px;">Compatibilidade: 50%</div>
                <button onclick="alert('iOS possui restrições severas de foco macro e câmera em WebViews nativas para códigos pequenos. Recomendado uso de pistola física USB/Bluetooth.')" style="margin-top: 8px; background: none; border: none; color: #0275d8; cursor: pointer; font-size: 11px; text-decoration: underline;">Por que isso?</button>
            </div>

            <!-- Android -->
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; text-align: center; width: 140px; background: #fafafa;">
                <span style="font-size: 24px;">🤖</span>
                <div style="font-weight: bold; margin: 5px 0; font-size: 14px;">Android</div>
                <div style="color: #5cb85c; font-weight: bold; font-size: 12px;">Compatibilidade: 100%</div>
                <button onclick="alert('O Android possui suporte nativo total ao motor de leitura de código de barras e foco automático otimizado.')" style="margin-top: 8px; background: none; border: none; color: #0275d8; cursor: pointer; font-size: 11px; text-decoration: underline;">Por que isso?</button>
            </div>
        </div>
    `;
}

inicializarLeitorTecladoPistola();

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;
window.renderizarAvisosCompatibilidadeAdmin = renderizarAvisosCompatibilidadeAdmin;