// ==========================================
// MÓDULO DE CÂMERA E LEITOR (PDV-VS)
// ==========================================

export async function abrirLeitorCamera(callbackSucesso) {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            // Ambiente Nativo (Android / iOS): Usa o plugin oficial MLKit Barcode Scanning
            const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted') {
                alert('Permissão de câmara negada.');
                return;
            }

            document.querySelector('body').classList.add('scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body').classList.remove('scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const codigoLido = result.barcodes[0].displayValue;
                enviarParaCampo(codigoLido, callbackSucesso);
            }
        } else {
            // Modo Web / Navegador de Computador: Simulação ou entrada manual limpa
            const codigoManual = prompt('Modo Web: Insira ou bipe o código de barras/produto:');
            if (codigoManual) {
                enviarParaCampo(codigoManual, callbackSucesso);
            }
        }
    } catch (error) {
        document.querySelector('body').classList.remove('scanner-active');
        console.error('Erro ao acionar a câmara:', error);
        alert('Erro ao abrir o leitor de câmara.');
    }
}

function enviarParaCampo(codigoLido, callbackSucesso) {
    if (callbackSucesso && typeof callbackSucesso === 'function') {
        try {
            callbackSucesso(codigoLido);
            return;
        } catch (e) {
            console.warn('Erro no callback, a usar preenchimento automático:', e);
        }
    }

    // Preenche o input ativo ou o padrão da tela
    const inputAlvo = document.activeElement && document.activeElement.tagName === 'INPUT' 
        ? document.activeElement 
        : (document.getElementById('buscaProduto') || document.getElementById('codigoBarras') || document.querySelector('input[type="text"]'));

    if (inputAlvo) {
        inputAlvo.value = codigoLido;
        inputAlvo.dispatchEvent(new Event('input', { bubbles: true }));
        inputAlvo.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
}

export const escanearCameraAdmin = abrirLeitorCamera;

export function fecharLeitorCamera() {
    document.querySelector('body').classList.remove('scanner-active');
    console.log('Leitor de câmera fechado.');
}

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;