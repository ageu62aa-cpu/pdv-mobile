import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

// Função unificada para abrir o leitor de câmera (Nativo ou Web)
export async function abrirLeitorCamera(callbackSucesso) {
    if (Capacitor.isNativePlatform()) {
        try {
            // Solicita permissão para a câmera nativa
            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted') {
                alert('Permissão de câmera negada.');
                return;
            }

            // Oculta o fundo e inicia a leitura nativa por hardware (Apple Vision / Google ML Kit)
            document.querySelector('body').classList.add('scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body').classList.remove('scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const codigoLido = result.barcodes[0].displayValue;
                if (callbackSucesso) callbackSucesso(codigoLido);
            }
        } catch (error) {
            document.querySelector('body').classList.remove('scanner-active');
            console.error('Erro no scanner nativo:', error);
        }
    } else {
        // Fallback para navegadores web tradicionais
        console.log('Modo Web: Usando leitor HTML5 alternativo');
        // Mantém a sua lógica web atual se necessário
    }
}

// Vinculações globais para o sistema
window.abrirLeitorCamera = abrirLeitorCamera;