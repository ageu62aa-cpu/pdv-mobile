// ==========================================
// MÓDULO NATIVO - CAPACITOR ML KIT SCANNER SEGURO
// ==========================================

export async function iniciarCameraNativa(onScanSuccess) {
    try {
        // Verifica se o Capacitor e o plugin nativo estão disponíveis no ambiente atual
        if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
            alert("O scanner nativo por câmera só funciona no aplicativo instalado no celular. Na web, utilize o leitor Bluetooth ou os inputs manuais.");
            return;
        }

        // Importação dinâmica para evitar que o navegador web quebre ao carregar a página
        const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

        const status = await BarcodeScanner.requestPermissions();
        if (status.camera !== 'granted') {
            alert('Permissão de câmera negada.');
            return;
        }

        document.querySelector('body').classList.add('scanner-active');

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
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
            await BarcodeScanner.stopScan();
        }
    } catch (e) {
        console.error("Erro ao fechar scanner nativo:", e);
    }
}

window.fecharCameraNativa = fecharCameraNativa;