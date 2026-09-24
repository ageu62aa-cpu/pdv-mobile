// ==========================================
// MÓDULO NATIVO - CAPACITOR ML KIT (PDV-VS)
// ==========================================

export async function dispararLeitorNativo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (!isNative || !window.Capacitor.Plugins || !window.Capacitor.Plugins.BarcodeScanner) {
            return null;
        }

        const BarcodeScannerPlugin = window.Capacitor.Plugins.BarcodeScanner;
        const plataforma = window.Capacitor.getPlatform();

        const sant = await BarcodeScannerPlugin.isSupported();
        if (!sant.supported) return null;

        const perm = await BarcodeScannerPlugin.requestPermissions();
        if (perm.camera !== 'granted' && perm.camera !== 'limited') {
            alert("Permissão de câmara negada nas configurações do seu dispositivo.");
            return null;
        }

        document.body.classList.add('barcode-scanner-active');

        if (plataforma === 'ios') {
            document.documentElement.style.setProperty('--background', 'transparent');
            document.body.style.background = 'transparent';
            try {
                await BarcodeScannerPlugin.hideBackground();
            } catch (e) {}
        }

        // Força a chamada unificada do ML Kit garantindo o layout padrão de cantoneiras quadradas em ambas as plataformas
        const resultado = await BarcodeScannerPlugin.scan({
            formats: ["EAN_13", "EAN_8", "CODE_128", "QR_CODE", "UPC_A", "UPC_E"],
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
            return resultado.barcodes[0].displayValue || resultado.barcodes[0].rawValue;
        }

        return null;
    } catch (err) {
        document.body.classList.remove('barcode-scanner-active');
        console.error("PDV-VS Erro no leitor nativo:", err);
        return null;
    }
}

export async function fecharLeitorNativo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            await window.Capacitor.Plugins.BarcodeScanner.stopScan().catch(() => {});
            await window.Capacitor.Plugins.BarcodeScanner.showBackground().catch(() => {});
            document.body.classList.remove('barcode-scanner-active');
            document.documentElement.style.removeProperty('--background');
            document.body.style.removeProperty('background');
        }
    } catch (e) {}
}