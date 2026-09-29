// ==========================================
// MÓDULO NATIVO - CAPACITOR ML KIT SCANNER
// ==========================================

import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export async function iniciarCameraNativa(onScanSuccess) {
    try {
        // Solicita permissão para usar a câmera
        const status = await BarcodeScanner.requestPermissions();
        if (status.camera !== 'granted') {
            alert('Permissão de câmera negada.');
            return;
        }

        // Deixa o fundo transparente para o scanner nativo aparecer
        document.querySelector('body').classList.add('scanner-active');

        // Inicia o scanner nativo de tela cheia do ML Kit
        const result = await BarcodeScanner.scan();

        await fecharCameraNativa();

        if (result.barcodes && result.barcodes.length > 0) {
            const codigoLimpo = result.barcodes[0].displayValue.trim();
            if (onScanSuccess) {
                onScanSuccess(codigoLimpo);
            }
        }
    } catch (err) {
        console.error("Erro no Scanner Nativo ML Kit:", err);
        await fecharCameraNativa();
    }
}

export async function fecharCameraNativa() {
    try {
        document.querySelector('body').classList.remove('scanner-active');
        await BarcodeScanner.stopScan();
    } catch (e) {
        console.error("Erro ao fechar scanner nativo:", e);
    }
}

window.fecharCameraNativa = fecharCameraNativa;