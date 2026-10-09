/**
 * Leitor contínuo de códigos de barras integrado ao modal do PDV.
 */

const MODAL_ID = 'modalCamera';
const READER_ID = 'reader';
let scanner = null;
let cameraStartInProgress = false;
let leituraBloqueada = false;

function atualizarStatusCamera(mensagem, erro = false) {
    const status = document.getElementById('camera-status');
    if (!status) return;

    status.textContent = mensagem;
    status.classList.toggle('text-red-400', erro);
    status.classList.toggle('text-gray-400', !erro);
}

function tratarEscapeCamera(evento) {
    if (evento.key === 'Escape') pararCamera();
}

function tocarBipeLeitura() {
    try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) return;

        const audioContext = new AudioContextConstructor();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 1800;
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.12);
        oscillator.addEventListener('ended', () => audioContext.close(), { once: true });
    } catch (error) {
        console.warn('[PDV-CAMERA] Bipe de confirmação indisponível:', error);
    }
}

function processarLeitura(codigo) {
    if (leituraBloqueada) return;

    leituraBloqueada = true;
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) inputBusca.value = codigo;

    const processarCodigo = window.tratarEnterBuscaCaixa;
    if (typeof processarCodigo === 'function') {
        processarCodigo({ key: 'Enter', preventDefault() {} });
        atualizarStatusCamera(`Código lido: ${codigo}`);
        tocarBipeLeitura();
    } else {
        atualizarStatusCamera('A função de busca do PDV ainda não está disponível.', true);
        console.error('[PDV-CAMERA] window.tratarEnterBuscaCaixa não está disponível.');
    }

    window.setTimeout(() => {
        leituraBloqueada = false;
        if (scanner?.isScanning) atualizarStatusCamera('Leitor contínuo ativo. Aponte para outro código.');
    }, 1200);
}

function obterConfigLeitura() {
    const container = document.getElementById(READER_ID);
    const largura = container?.clientWidth || 280;
    const tamanhoJanela = Math.max(160, Math.min(240, largura - 32));

    return {
        fps: 12,
        qrbox: { width: tamanhoJanela, height: tamanhoJanela },
        aspectRatio: 1,
        disableFlip: false
    };
}

async function iniciarLeitura() {
    const modal = document.getElementById(MODAL_ID);
    const container = document.getElementById(READER_ID);

    if (!modal || !container) {
        throw new Error('O modal ou a área #reader do leitor não foi encontrada.');
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('A câmera exige uma conexão HTTPS e permissão de acesso no navegador.');
    }
    if (typeof window.Html5Qrcode !== 'function') {
        throw new Error('A biblioteca Html5Qrcode não foi carregada.');
    }

    modal.classList.remove('hidden');
    atualizarStatusCamera('Solicitando acesso à câmera...');

    if (scanner?.isScanning) {
        atualizarStatusCamera('Leitor contínuo ativo. Aponte para um código.');
        return;
    }

    if (!scanner) scanner = new window.Html5Qrcode(READER_ID, { verbose: false });

    const config = obterConfigLeitura();
    try {
        await scanner.start(
            { facingMode: 'environment' },
            config,
            processarLeitura,
            () => {}
        );
    } catch (erroCameraTraseira) {
        console.warn('[PDV-CAMERA] Não foi possível selecionar a câmera traseira diretamente; tentando listar as câmeras disponíveis.', erroCameraTraseira);
        const cameras = await window.Html5Qrcode.getCameras();
        if (!cameras.length) throw erroCameraTraseira;

        const camera = cameras.find(({ label }) => /back|rear|environment|traseir/i.test(label)) || cameras[0];
        await scanner.start(
            { deviceId: { exact: camera.id } },
            config,
            processarLeitura,
            () => {}
        );
    }
    atualizarStatusCamera('Leitor contínuo ativo. Aponte para um código.');
    console.info('[PDV-CAMERA] Leitor contínuo ativo.');
}

export async function abrirLeitorCamera() {
    if (cameraStartInProgress) return;
    cameraStartInProgress = true;

    const modal = document.getElementById(MODAL_ID);
    modal?.classList.remove('hidden');
    window.addEventListener('keydown', tratarEscapeCamera);

    try {
        await iniciarLeitura();
    } catch (error) {
        console.error('[PDV-CAMERA] Não foi possível iniciar a câmera:', error);
        atualizarStatusCamera(error.message || 'Não foi possível iniciar a câmera.', true);
    } finally {
        cameraStartInProgress = false;
    }
}

export async function pararCamera() {
    const modal = document.getElementById(MODAL_ID);
    window.removeEventListener('keydown', tratarEscapeCamera);
    if (scanner?.isScanning) {
        try {
            await scanner.stop();
            await scanner.clear();
            scanner = null;
        } catch (error) {
            console.error('[PDV-CAMERA] Erro ao encerrar a câmera:', error);
        }
    }

    leituraBloqueada = false;
    modal?.classList.add('hidden');
}

export function inicializarLeitorTecladoPistola() {
    console.info('[PDV-LEITOR] Suporte a leitor USB/Bluetooth ativo.');
}

window.iniciarCamera = abrirLeitorCamera;
window.pararCamera = pararCamera;
window.fecharCameraWeb = pararCamera;
window.alternarCamera = async () => {
    const modal = document.getElementById(MODAL_ID);
    if (modal && !modal.classList.contains('hidden')) {
        await pararCamera();
    } else {
        await abrirLeitorCamera();
    }
};
window.abrirLeitorCamera = abrirLeitorCamera;
window.abrirCameraScanner = abrirLeitorCamera;
window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;
