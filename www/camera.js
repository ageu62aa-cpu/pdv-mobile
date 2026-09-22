// ==========================================
// MÓDULO DE CÂMERA E LEITOR (PDV-VS)
// ==========================================

export async function abrirLeitorCamera(callbackSucesso) {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted') {
                alert('Permissão de câmera negada.');
                return;
            }

            document.querySelector('body').classList.add('scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body').classList.remove('scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const codigoLido = result.barcodes[0].displayValue;
                if (callbackSucesso) callbackSucesso(codigoLido);
            }
        } else {
            // Modo Web: Abre a webcam usando a API nativa do navegador
            console.log('Modo Web: A iniciar webcam...');
            
            // Cria um modal simples na tela para exibir a câmara se não existir
            let modalCamera = document.getElementById('modalWebCamera');
            if (!modalCamera) {
                modalCamera = document.createElement('div');
                modalCamera.id = 'modalWebCamera';
                modalCamera.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
                modalCamera.innerHTML = `
                    <div style="background:white;padding:20px;border-radius:8px;text-align:center;max-width:400px;width:90%;">
                        <h3 style="margin-bottom:10px;font-weight:bold;">Leitor de Código de Barras (Web)</h3>
                        <video id="webcamVideo" style="width:100%;max-height:300px;background:black;border-radius:4px;"></video>
                        <p style="margin-top:10px;font-size:12px;color:#666;">Aponte o código de barras para a câmara ou feche.</p>
                        <button id="fecharWebCamBtn" style="margin-top:10px;background:#e11d48;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;">Fechar Câmara</button>
                    </div>
                `;
                document.body.appendChild(modalCamera);

                document.getElementById('fecharWebCamBtn').onclick = () => {
                    fecharLeitorCamera();
                };
            }

            modalCamera.style.display = 'flex';
            const videoElement = document.getElementById('webcamVideo');

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoElement.srcObject = stream;
            videoElement.play();

            // Nota: Para leitura automática de imagem de código de barras via web, 
            // podes digitar manualmente o código ou integrar uma biblioteca de leitura se necessário.
        }
    } catch (error) {
        document.querySelector('body').classList.remove('scanner-active');
        console.error('Erro ao acionar a câmera:', error);
        alert('Não foi possível aceder à câmara do dispositivo.');
    }
}

export const escanearCameraAdmin = abrirLeitorCamera;

export function fecharLeitorCamera() {
    const modalCamera = document.getElementById('modalWebCamera');
    if (modalCamera) {
        modalCamera.style.display = 'none';
        const videoElement = document.getElementById('webcamVideo');
        if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }
    }
    document.querySelector('body').classList.remove('scanner-active');
    console.log('Leitor de câmera fechado.');
}

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;