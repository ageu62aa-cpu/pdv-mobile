// ==========================================
// LEITOR COMPARTILHADO ANDROID / IOS / WEB (PDV-VS)
// ==========================================

let html5QrcodeInstance = null;

export async function iniciarCameraWeb(onScanSuccess) {
    try {
        if (html5QrcodeInstance) {
            await fecharCameraWeb();
        }

        const modalCam = document.getElementById('modalCamera');
        if (modalCam) {
            modalCam.style.zIndex = "99999";
            modalCam.classList.add('flex');
            modalCam.classList.remove('hidden');
        }

        const elementId = "videoPreviewCamera";
        const container = document.getElementById(elementId);
        if (!container) throw new Error(`Elemento de câmera não encontrado: #${elementId}`);

        const QrLib = window.Html5Qrcode;
        const supportedFormats = window.Html5QrcodeSupportedFormats;
        if (!QrLib || !supportedFormats) {
            throw new Error("Biblioteca Html5Qrcode não foi carregada.");
        }

        html5QrcodeInstance = new QrLib(elementId);

        let ultimoCodigoLido = '';
        let tempoUltimoDisparo = 0;

        const formatosPermitidos = [
            supportedFormats.EAN_13,
            supportedFormats.EAN_8,
            supportedFormats.CODE_128,
            supportedFormats.CODE_39,
            supportedFormats.UPC_A,
            supportedFormats.UPC_E,
            supportedFormats.QR_CODE
        ];

        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => ({
                    width: Math.floor(Math.min(viewfinderWidth * 0.9, 480)),
                    height: Math.floor(Math.min(viewfinderHeight * 0.5, 220))
                }),
                formatsToSupport: formatosPermitidos,
                videoConstraints: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
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
        await fecharCameraWeb();
        alert("Não foi possível iniciar a câmera. Verifique a permissão de câmera do aplicativo e tente novamente.");
    }
}

export async function fecharCameraWeb() {
    if (html5QrcodeInstance) {
        try {
            if (html5QrcodeInstance.isScanning) await html5QrcodeInstance.stop();
            await html5QrcodeInstance.clear();
        } catch (err) {
            console.error("PDV-VS Erro ao encerrar Html5Qrcode:", err);
        }
        html5QrcodeInstance = null;
    }

    const modalCamera = document.getElementById('modalCamera');
    if (modalCamera) {
        modalCamera.classList.add('hidden');
        modalCamera.classList.remove('flex');
    }
}

window.fecharCameraWeb = fecharCameraWeb;