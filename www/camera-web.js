// ==========================================
// MÓDULO WEB - HTML5 QRCODE FALLBACK (PDV-VS)
// ==========================================

let html5QrcodeInstance = null;

export async function iniciarCameraWeb(onScanSuccess) {
    try {
        if (html5QrcodeInstance) {
            try {
                if (html5QrcodeInstance.isScanning) await html5QrcodeInstance.stop();
            } catch (e) {}
            html5QrcodeInstance = null;
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        const modalCam = document.getElementById('modalCamera');
        if (modalCam) {
            modalCam.style.zIndex = "99999";
            modalCam.classList.add('flex');
            modalCam.classList.remove('hidden');
        }

        const elementId = "videoPreviewCamera";
        const container = document.getElementById(elementId);
        if (!container) return;

        const QrLib = window.Html5Qrcode;
        if (!QrLib) return;

        html5QrcodeInstance = new QrLib(elementId);

        let ultimoCodigoLido = '';
        let tempoUltimoDisparo = 0;

        const formatosPermitidos = [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
        ];

        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            {
                fps: 30,
                // Moldura quadrada otimizada (80%) com proporção padrão 4:3 para renderizar em ambas as plataformas
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const edgeSize = Math.floor(minEdge * 0.80);
                    return {
                        width: edgeSize,
                        height: edgeSize
                    };
                },
                aspectRatio: 1.33333,
                formatsToSupport: formatosPermitidos,
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

                if (codigoLimpo === ultimoCodigoLido && (agora - tempoUltimoDisparo) < 800) {
                    return;
                }
                ultimoCodigoLido = codigoLimpo;
                tempoUltimoDisparo = agora;

                if (onScanSuccess) onScanSuccess(codigoLimpo);
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
        console.error("PDV-VS Erro Html5Qrcode Web:", err);
        fecharCameraWeb();
    }
}

export async function fecharCameraWeb() {
    if (html5QrcodeInstance) {
        try {
            if (html5QrcodeInstance.isScanning) await html5QrcodeInstance.stop();
        } catch (e) {}
        html5QrcodeInstance = null;
    }

    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
}

window.fecharCameraWeb = fecharCameraWeb;