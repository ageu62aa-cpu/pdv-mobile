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

        // Iniciamos a câmera sem qrbox interno da biblioteca para evitar conflitos de renderização no mobile
        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            {
                fps: 30,
                formatsToSupport: formatosPermitidos,
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
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

                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }
            },
            () => {}
        );

        // Ajustes visuais garantindo consistência no vídeo e criando a moldura fixa universal
        setTimeout(() => {
            const videoElement = container.querySelector('video');
            if (videoElement) {
                videoElement.style.objectFit = 'cover';
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
            }

            // Injeta uma camada visual de moldura padronizada se ela já não existir no container
            if (!container.querySelector('.moldura-customizada-pdv')) {
                const overlay = document.createElement('div');
                overlay.className = 'moldura-customizada-pdv';
                overlay.style.position = 'absolute';
                overlay.style.top = '50%';
                overlay.style.left = '50%';
                overlay.style.transform = 'translate(-50%, -50%)';
                overlay.style.width = '75%';
                overlay.style.height = '180px';
                overlay.style.border = '3px solid rgba(255, 255, 255, 0.8)';
                overlay.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
                overlay.style.borderRadius = '12px';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '10';
                container.style.position = 'relative';
                container.appendChild(overlay);
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