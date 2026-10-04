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

        // Restaura o qrbox otimizado para focar exatamente na área de leitura do código de barras
        const qrboxSize = (window.innerWidth < 768) ? { width: 280, height: 160 } : { width: 350, height: 180 };

        await html5QrcodeInstance.start(
            { facingMode: "environment" },
            {
                fps: 30,
                qrbox: qrboxSize,
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

                // Feedback visual de sucesso: muda as bordas para verde instantaneamente ao capturar
                const moldura = container.querySelector('.moldura-customizada-pdv');
                if (moldura) {
                    moldura.style.borderColor = '#10B981'; // Verde esmeralda de sucesso
                    setTimeout(() => {
                        moldura.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                    }, 400);
                }

                if (onScanSuccess) onScanSuccess(codigoLimpo);

                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }
            },
            () => {}
        );

        // Ajustes visuais com as quatro bordas estilo mira profissional de scanner
        setTimeout(() => {
            const videoElement = container.querySelector('video');
            if (videoElement) {
                videoElement.style.objectFit = 'cover';
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
            }

            if (!container.querySelector('.moldura-customizada-pdv')) {
                const overlay = document.createElement('div');
                overlay.className = 'moldura-customizada-pdv';
                overlay.style.position = 'absolute';
                overlay.style.top = '50%';
                overlay.style.left = '50%';
                overlay.style.transform = 'translate(-50%, -50%)';
                overlay.style.width = `${qrboxSize.width}px`;
                overlay.style.height = `${qrboxSize.height}px`;
                // Estilo profissional com bordas destacadas nos cantos/lados
                overlay.style.border = '2px dashed rgba(255, 255, 255, 0.8)';
                overlay.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.6)';
                overlay.style.borderRadius = '10px';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '10';
                overlay.style.transition = 'border-color 0.2s ease';
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