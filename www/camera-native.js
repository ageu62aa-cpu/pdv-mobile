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
        const sant = await BarcodeScannerPlugin.isSupported();
        if (!sant.supported) return null;

        const perm = await BarcodeScannerPlugin.requestPermissions();
        if (perm.camera !== 'granted' && perm.camera !== 'limited') {
            alert("Permissão de câmara negada nas configurações do seu dispositivo.");
            return null;
        }

        // Força a interface padrão de alta performance com a moldura quadrada e cantoneiras de foco
        const resultado = await BarcodeScannerPlugin.scan({
            formats: ["EAN_13", "EAN_8", "CODE_128", "QR_CODE", "UPC_A", "UPC_E"],
            lensFacing: "back",
            // Configurações explícitas para garantir o renderizador da moldura quadrada com cantoneiras
            targetedFormats: ["EAN_13", "CODE_128"]
        });

        if (resultado && resultado.barcodes && resultado.barcodes.length > 0) {
            return resultado.barcodes[0].displayValue || resultado.barcodes[0].rawValue;
        }

        return null;
    } catch (err) {
        console.error("PDV-VS Erro no leitor nativo:", err);
        return null;
    }
}

export async function fecharLeitorNativo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            await window.Capacitor.Plugins.BarcodeScanner.stopScan().catch(() => {});
        }
    } catch (e) {}
}