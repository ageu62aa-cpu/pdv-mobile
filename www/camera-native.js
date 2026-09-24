// ==========================================
// MÓDULO NATIVO - CAPACITOR ML KIT (PDV-VS)
// ==========================================

let activeScanListener = null;

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

        if (activeScanListener) {
            await activeScanListener.remove().catch(() => {});
            activeScanListener = null;
        }

        document.body.classList.add('barcode-scanner-active');

        return new Promise(async (resolve) => {
            let resolvido = false;

            try {
                activeScanListener = await BarcodeScannerPlugin.addListener('barcodeScanned', async event => {
                    if (event && event.barcode && !resolvido) {
                        resolvido = true;
                        const codigo = event.barcode.displayValue || event.barcode.rawValue;
                        await fecharLeitorNativo();
                        resolve(codigo);
                    }
                });

                // startScan usa showUIElements = false internamente, exibindo a moldura limpa com cantoneiras
                await BarcodeScannerPlugin.startScan({
                    formats: ["EAN_13", "EAN_8", "CODE_128", "QR_CODE", "UPC_A", "UPC_E"],
                    lensFacing: "back"
                });

            } catch (err) {
                console.error("PDV-VS Erro no startScan nativo:", err);
                await fecharLeitorNativo();
                if (!resolvido) {
                    resolvido = true;
                    resolve(null);
                }
            }
        });

    } catch (err) {
        console.error("PDV-VS Erro geral no leitor nativo:", err);
        await fecharLeitorNativo();
        return null;
    }
}

export async function fecharLeitorNativo() {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.BarcodeScanner) {
            if (activeScanListener) {
                await activeScanListener.remove().catch(() => {});
                activeScanListener = null;
            }
            await BarcodeScannerPlugin.stopScan().catch(() => {});
        }
    } catch (e) {} finally {
        document.body.classList.remove('barcode-scanner-active');
    }
}