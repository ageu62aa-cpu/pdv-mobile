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
            if (bufferLeitor && bufferLeitor.trim().length > 1) {  
                e.preventDefault();  
                e.stopPropagation();  
                const codigoLido = bufferLeitor.trim();  
                bufferLeitor = '';  
                processarCodigoCapturadoUniversal(codigoLido);  
            }  
        } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {  
            bufferLeitor += e.key;  
        }  
    };  

    window.addEventListener('keydown', listenerTecladoGlobal);  
}  

// Executado ao abrir leitor para Vendas (Modo Contínuo / Pistola por Vídeo)  
export async function abrirLeitorCamera() {  
    console.log("PDV-VS: Abrindo leitor contínuo para Vendas");  
    setOrigemLeitor('busca');  
    await dispararLeitorDispositivo();  
}  

// Executado ao abrir leitor no Admin (Modo Único / Fechamento Automático)  
export async function escanearCameraAdmin() {  
    console.log("PDV-VS: Abrindo leitor único para Admin");  
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
                    
                    // Tratamento específico e rigoroso para iOS não perder a transparência e foco da câmara nativa  
                    if (plataforma === 'ios') {  
                        document.documentElement.style.setProperty('--background', 'transparent');  
                        document.body.style.background = 'transparent';  
                        try {  
                            await BarcodeScannerPlugin.hideBackground();  
                        } catch (e) {}  
                    }  

                    // Chamada nativa otimizada com os formatos de códigos de barras restritos para máxima performance  
                    const resultado = await BarcodeScannerPlugin.scan({  
                        formats: [  
                            "EAN_13",  
                            "EAN_8",  
                            "CODE_128",  
                            "QR_CODE",  
                            "UPC_A",  
                            "UPC_E"  
                        ],  
                        lensFacing: "back"  
                    });  
                    
                    document.body.classList.remove('barcode-scanner-active');  
                    if (plataforma === 'ios') {  
                        document.documentElement.style.removeProperty('--background');  
                        document.body.style.removeProperty('background');  
                        try {  
                            await BarcodeScannerPlugin.showBackground();  
                        } catch (e) {}  
                    }  

                    if (resultado && resultado.barcodes && resultado.barcodes.length > 0) {  
                        const codigoLido = resultado.barcodes[0].displayValue || resultado.barcodes[0].rawValue;  
                        if (codigoLido) {  
                            setTimeout(() => {  
                                processarCodigoCapturadoUniversal(codigoLido.trim());  
                            }, 50);  
                            return;  
                        }  
                    }  
                    return;  
                } else {  
                    alert("Permissão de câmara negada nas configurações do seu dispositivo.");  
                }  
            }  
        }  

        prepararModalCameraWeb();  
        await iniciarCameraComHtml5Qrcode();  

    } catch (err) {  
        console.error("PDV-VS Erro ao acionar leitor do dispositivo:", err);  
        document.body.classList.remove('barcode-scanner-active');  
        await fecharLeitorCamera();  
        
        const codigoManual = prompt("Não foi possível aceder à câmara automaticamente. Digite ou bipe o código:");  
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
            await new Promise(resolve => setTimeout(resolve, 80));  
        }  
        
        const elementId = "videoPreviewCamera";  
        const container = document.getElementById(elementId);  
        if (!container) return;  

        const QrLib = window.Html5Qrcode;  
        if (!QrLib) return;  

        const instance = new QrLib(elementId);  
        setHtml5QrcodeInstance(instance);  
        
        let ultimoCodigoLido = '';  
        let tempoUltimoDisparo = 0;  

        await instance.start(  
            { facingMode: "environment" },  
            {   
                fps: 35,   
                qrbox: { width: 250, height: 250 },   
                aspectRatio: 1.33333,   
                videoConstraints: {  
                    width: { ideal: 1280 },  
                    height: { ideal: 720 },  
                    facingMode: "environment"  
                }  
            },  
            (decodedText) => {  
                if (!decodedText) return;  
                const codigoLimpo = decodedText.trim();  
                const agora = Date.now();  

                if (codigoLimpo === ultimoCodigoLido && (agora - tempoUltimoDisparo) < 900) {  
                    return;  
                }  
                ultimoCodigoLido = codigoLimpo;  
                tempoUltimoDisparo = agora;  

                processarCodigoCapturadoUniversal(codigoLimpo);  
            },  
            () => {}  
        );  

        setTimeout(() => {  
            const videoElement = container.querySelector('video');  
            if (videoElement) {  
                videoElement.style.objectFit = 'cover';  
                videoElement.style.width = '100%';  
                videoElement.style.height = '100%';  
            }  
        }, 150);  

    } catch (err) {  
        console.error("PDV-VS Erro Html5Qrcode:", err);  
        fecharLeitorCamera();  
    }  
}  

// Processamento unificado direcionando corretamente para Vendas ou Admin
function processarCodigoCapturadoUniversal(termoDigitado) {  
    if (!termoDigitado || termoDigitado.length < 1) return;  

    console.log(`PDV-VS: Processando termo [Origem: ${origemLeitor}] ->`, termoDigitado);  
    
    if (origemLeitor === 'admin') {  
        fecharLeitorCamera();  
    }  

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
            document.body.style.removeProperty('background');  
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

window.mostrarDetalhesCompatibilidade = function(sistema) {  
    if (sistema === 'android') {  
        alert("Android: Compatibilidade 100%\n\nO Android consegue capturar com muita eficiência todos os códigos de barras através da câmara.");  
    } else if (sistema === 'ios') {  
        alert("iOS (iPhone): Compatibilidade 100%\n\nCom o motor nativo otimizado do ML Kit, o iPhone lê códigos de barras com máxima precisão e velocidade.");  
    }  
};  

export function renderizarAvisosCompatibilidadeAdmin() {  
    const inputCodigo = document.getElementById('formCodigo');  
    if (!inputCodigo) return;  

    let containerAvisos = document.getElementById('painelAvisosCompatibilidade');  
    if (!containerAvisos) {  
        containerAvisos = document.createElement('div');  
        containerAvisos.id = 'painelAvisosCompatibilidade';  
        containerAvisos.style.cssText = "display: flex; gap: 10px; margin-top: 8px; justify-content: space-between;";  
        
        containerAvisos.innerHTML = '<div onclick="window.mostrarDetalhesCompatibilidade(\'android\')" style="flex: 1; border: 1px solid #d1e7dd; background: #f8f9fa; padding: 6px; border-radius: 6px; text-align: center; cursor: pointer;"><span style="font-size: 16px;">🤖</span><div style="font-size: 11px; font-weight: bold; color: #155724;">Android: 100%</div></div><div onclick="window.mostrarDetalhesCompatibilidade(\'ios\')" style="flex: 1; border: 1px solid #f8f7da; background: #f8f9fa; padding: 6px; border-radius: 6px; text-align: center; cursor: pointer;"><span style="font-size: 16px;">🍏</span><div style="font-size: 11px; font-weight: bold; color: #721c24;">iOS: 100%</div></div>';  
        
        inputCodigo.parentNode.insertBefore(containerAvisos, inputCodigo.nextSibling);  
    }  
}  

setInterval(() => {  
    const modalProduto = document.getElementById('formCodigo');  
    if (modalProduto) {  
        renderizarAvisosCompatibilidadeAdmin();  
    }  
}, 1000);  

inicializarLeitorTecladoPistola();  

window.abrirLeitorCamera = abrirLeitorCamera;  
window.escanearCameraAdmin = escanearCameraAdmin;  
window.fecharLeitorCamera = fecharLeitorCamera;