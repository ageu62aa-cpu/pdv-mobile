// ==========================================
// MÓDULO DE CÂMERA E LEITOR (PDV-VS)
// ==========================================

let html5QrCode = null;

export async function abrirLeitorCamera(callbackSucesso) {
    try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        if (isNative) {
            // Ambiente Nativo (Android / iOS): Usa o plugin oficial
            const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');

            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted') {
                alert('Permissão de câmara negada.');
                return;
            }

            document.querySelector('body').classList.add('scanner-active');
            const result = await BarcodeScanner.scan();
            document.querySelector('body').classList.remove('scanner-active');

            if (result.barcodes && result.barcodes.length > 0) {
                const codigoLido = result.barcodes[0].displayValue;
                enviarParaCampo(codigoLido, callbackSucesso);
            }
        } else {
            // Modo Web / Navegador: Abre o modal com a webcam real via HTML5
            console.log('Modo Web: A iniciar pré-visualização da câmara...');

            let modalCamera = document.getElementById('modalWebCamera');
            if (!modalCamera) {
                modalCamera = document.createElement('div');
                modalCamera.id = 'modalWebCamera';
                modalCamera.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
                modalCamera.innerHTML = `
                    <div style="background:white;padding:20px;border-radius:12px;text-align:center;max-width:420px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.3);">
                        <h3 style="margin-bottom:12px;font-weight:bold;font-size:18px;color:#1e293b;">Leitor de Código de Barras</h3>
                        <div id="readerContainer" style="width:100%;min-height:250px;background:#000;border-radius:8px;overflow:hidden;"></div>
                        <p style="margin-top:12px;font-size:13px;color:#64748b;">Aponte o código de barras para a câmara.</p>
                        <button id="fecharWebCamBtn" style="margin-top:12px;background:#e11d48;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600;">Fechar Câmara</button>
                    </div>
                `;
                document.body.appendChild(modalCamera);

                document.getElementById('fecharWebCamBtn').onclick = () => {
                    fecharLeitorCamera();
                };
            }

            modalCamera.style.display = 'flex';

            if (!window.Html5Qrcode) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            if (!html5QrCode) {
                html5QrCode = new window.Html5Qrcode("readerContainer");
            }

            await html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    console.log(`Código lido com sucesso na Web: ${decodedText}`);
                    // ORDEM CORRIGIDA: Envia primeiro para o campo, depois fecha
                    enviarParaCampo(decodedText, callbackSucesso);
                    fecharLeitorCamera();
                },
                (errorMessage) => {
                    // Ignora erros de frame contínuos enquanto busca o código
                }
            );
        }
    } catch (error) {
        document.querySelector('body').classList.remove('scanner-active');
        console.error('Erro ao acionar a câmara:', error);
        alert('Não foi possível aceder à câmara.');
    }
}

function enviarParaCampo(codigoLido, callbackSucesso) {
    if (callbackSucesso && typeof callbackSucesso === 'function') {
        try {
            callbackSucesso(codigoLido);
            return;
        } catch (e) {
            console.warn('Erro no callback, a usar preenchimento automático:', e);
        }
    }

    const inputAlvo = document.activeElement && document.activeElement.tagName === 'INPUT' 
        ? document.activeElement 
        : (document.getElementById('buscaProduto') || document.getElementById('codigoBarras') || document.querySelector('input[type="text"]'));

    if (inputAlvo) {
        inputAlvo.focus();
        inputAlvo.value = codigoLido;
        inputAlvo.dispatchEvent(new Event('input', { bubbles: true }));
        inputAlvo.dispatchEvent(new Event('change', { bubbles: true }));
        inputAlvo.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    } else {
        console.warn('Nenhum input alvo encontrado para preencher o código:', codigoLido);
    }
}

export const escanearCameraAdmin = abrirLeitorCamera;

export async function fecharLeitorCamera() {
    try {
        if (html5QrCode && html5QrCode.isScanning) {
            await html5QrCode.stop();
            await html5QrCode.clear();
        }
    } catch (e) {
        console.warn('Aviso ao fechar leitor web:', e);
    }

    const modalCamera = document.getElementById('modalWebCamera');
    if (modalCamera) {
        modalCamera.style.display = 'none';
    }
    document.querySelector('body').classList.remove('scanner-active');
    console.log('Leitor de câmera fechado.');
}

window.abrirLeitorCamera = abrirLeitorCamera;
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;