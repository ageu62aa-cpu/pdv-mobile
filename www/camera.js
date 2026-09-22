// ==========================================
// MÓDULO DE CÂMERA E LEITOR (PDV-VS)
// ==========================================

export async function abrirLeitorCamera(callbackSucesso) {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted') {
                alert('Permissão de câmera negada.');
                return;
            }

            document.querySelector('body').classList.add('scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body').classList.remove('scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const codigoLido = result.barcodes[0].displayValue;
                if (callbackSucesso) callbackSucesso(codigoLido);
            }
        } else {
            console.log('Modo Web: Usando leitor HTML5 alternativo');
        }
    } catch (error) {
        document.querySelector('body').classList.remove('scanner-active');
        console.error('Erro ao acionar a câmera:', error);
    }
}

// Exportações extras exigidas pelo main.js
export const escanearCameraAdmin = abrirLeitorCamera;

export function fecharLeitorCamera() {
    document.querySelector('body').classList.remove('scanner-active');
    console.log('Leitor de câmera fechado.');
}

// Expõe globalmente para fallback
window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;