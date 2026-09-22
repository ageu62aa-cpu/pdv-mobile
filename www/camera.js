// Função unificada para abrir o leitor de câmera (Nativo ou Web)
export async function abrirLeitorCamera(callbackSucesso) {
    try {
        // Verifica de forma segura se o Capacitor está disponível no ambiente
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            // Importa dinamicamente apenas no aplicativo nativo
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
            // Sua lógica web atual continua aqui se necessário
        }
    } catch (error) {
        document.querySelector('body').classList.remove('scanner-active');
        console.error('Erro ao acionar a câmera:', error);
    }
}

window.abrirLeitorCamera = abrirLeitorCamera;