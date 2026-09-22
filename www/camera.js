// ==========================================
// MÓDULO DE LEITOR DE CÂMERA E PISTOLA (PDV-VS)
// ==========================================

import { 
    origemLeitor, html5QrcodeInstance, setOrigemLeitor, 
    setHtml5QrcodeInstance, produtosCache 
} from './state.js';
import { tratarAdicaoProduto } from './produtos.js';

// Importação dinâmica segura do plugin nativo do Capacitor (caso esteja no mobile)
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

let listenerTecladoGlobal = null;

// Inicializa o listener global da pistola de código de barras física / teclado (PC e Web)
export function inicializarLeitorTecladoPistola() {
    if (listenerTecladoGlobal) return;

    let bufferLeitor = '';
    let ultimoTempo = Date.now();

    listenerTecladoGlobal = (e) => {
        const tempoAtual = Date.now();

        // Se o modal de câmera nativa estiver aberto, ignora a pistola para não duplicar
        const modalCam = document.getElementById('modalCamera');
        if (modalCam && !modalCam.classList.contains('hidden')) return;

        // Se o usuário estiver digitando normalmente devagar em outro input, limpa o buffer
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

// Decide se usa o leitor nativo do celular (Capacitor - iOS/Android) ou abre a modal Web (Fallback)
async function dispararLeitorDispositivo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            const plataforma = window.Capacitor.getPlatform(); // 'ios' ou 'android'
            console.log(`PDV-VS: Plataforma nativa detectada -> ${plataforma}`);

            const sant = await BarcodeScanner.isSupported();
            if (sant.supported) {
                const perm = await BarcodeScanner.requestPermissions();
                
                if (perm.camera === 'granted' || perm.camera === 'limited') {
                    // Configurações específicas para exibição correta no iOS e Android
                    document.body.classList.add('barcode-scanner-active');
                    
                    if (plataforma === 'ios') {
                        // Tratamento de transparência de fundo específico para iOS renderizar a câmera nativa
                        document.documentElement.style.setProperty('--background', 'transparent');
                        try {
                            await BarcodeScanner.hideBackground();
                        } catch (e) {
                            console.warn("Aviso ao ocultar fundo no iOS:", e);
                        }
                    }

                    // Dispara a leitura nativa
                    const resultado = await BarcodeScanner.scan();
                    
                    // Restaura os padrões visuais após a leitura
                    document.body.classList.remove('barcode-scanner-active');
                    if (plataforma === 'ios') {
                        document.documentElement.style.removeProperty('--background');
                        try {
                            await BarcodeScanner.showBackground();
                        } catch (e) {}
                    }

                    if (resultado && resultado.barcodes && resultado.barcodes.length > 0) {
                        const codigoLido = resultado.barcodes[0].displayValue || resultado.barcodes[0].rawValue;
                        if (codigoLido) {
                            // Pequeno atraso para garantir que o DOM retomou o foco corretamente após fechar a view nativa
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
            } catch (e) {
                console.warn("Aviso ao limpar instância anterior:", e);
            }
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

// Núcleo unificado que entrega o código lido para o PDV ou para o Admin
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
        // Direciona especificamente para o campo do modal administrativo (visível na sua imagem do painel)
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
        if (isNative) {
            await BarcodeScanner.stopScan().catch(() => {});
            await BarcodeScanner.showBackground().catch(() => {});
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

// Inicializa o leitor de teclado/pistola assim que o script é carregado
inicializarLeitorTecladoPistola();

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;