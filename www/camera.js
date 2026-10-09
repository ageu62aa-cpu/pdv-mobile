/**
 * Leitor contínuo de códigos de barras integrado ao modal do PDV.
 */

const MODAL_ID = 'modalCamera';
const READER_ID = 'reader';
let scanner = null;
let cameraStartInProgress = false;
let leituraBloqueada = false;
let modosFocoDisponiveis = [];

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
    const codigoInput = document.getElementById('camera-codigo');
    const leituraStatus = document.getElementById('camera-leitura-status');
    if (codigoInput) codigoInput.value = codigo;
    if (leituraStatus) leituraStatus.textContent = `${codigo.length} dígitos identificados`;

    const produto = window.buscarProdutoPorCodigoScanner?.(codigo);
    if (produto) {
        document.getElementById('camera-produto-status').textContent = 'Cadastrado';
        document.getElementById('camera-produto-status').className = 'rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-400';
        document.getElementById('camera-produto-nome').textContent = produto.nome || 'Produto sem descrição';
        document.getElementById('camera-produto-categoria').textContent = `Categoria: ${produto.categoria || 'Não informada'}`;
        document.getElementById('camera-produto-estoque').textContent = Number(produto.estoque || 0).toLocaleString('pt-BR');
        document.getElementById('camera-produto-unidade').textContent = `Unidade: ${produto.unidade || 'UN'}`;
        document.getElementById('camera-produto-preco').textContent = Number(produto.preco_venda || produto.preco || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        try {
            if (typeof window.adicionarItemVendaPorObjeto === 'function') {
                window.adicionarItemVendaPorObjeto(JSON.stringify(produto).replace(/"/g, '&quot;'));
                document.getElementById('camera-integracao-status').textContent = 'Produto adicionado ao caixa';
            } else {
                const inputBusca = document.getElementById('inputBusca');
                if (inputBusca) inputBusca.value = codigo;
                window.tratarEnterBuscaCaixa?.({ key: 'Enter', target: inputBusca, preventDefault() {} });
                document.getElementById('camera-integracao-status').textContent = 'Código enviado para o caixa';
            }
            atualizarStatusCamera('Produto identificado e enviado ao caixa.');
            tocarBipeLeitura();
        } catch (error) {
            atualizarStatusCamera('Produto identificado, mas não foi possível adicioná-lo ao caixa.', true);
            document.getElementById('camera-integracao-status').textContent = 'Falha ao adicionar produto';
            console.error('[PDV-CAMERA] Erro ao integrar o produto com o caixa:', error);
        }
    } else {
        document.getElementById('camera-produto-status').textContent = 'Não cadastrado';
        document.getElementById('camera-produto-status').className = 'rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-400';
        document.getElementById('camera-produto-nome').textContent = 'Produto não encontrado no cadastro';
        document.getElementById('camera-produto-categoria').textContent = 'Categoria: —';
        document.getElementById('camera-produto-estoque').textContent = '—';
        document.getElementById('camera-produto-unidade').textContent = 'Unidade: —';
        document.getElementById('camera-produto-preco').textContent = '—';
        document.getElementById('camera-integracao-status').textContent = 'Não adicionado';
        atualizarStatusCamera(`Código ${codigo} não localizado no cadastro.`, true);
    }

    window.setTimeout(() => {
        leituraBloqueada = false;
        if (scanner?.isScanning && produto)         await configurarFocoAutomatico();
        atualizarStatusCamera('Leitor contínuo ativo. Aponte para outro código.');
    }, 1200);
}

function obterFormatosSuportados() {
    const formatos = window.Html5QrcodeSupportedFormats;
    if (!formatos) return undefined;

    return [
        'AZTEC',
        'CODABAR',
        'CODE_39',
        'CODE_93',
        'CODE_128',
        'DATA_MATRIX',
        'EAN_8',
        'EAN_13',
        'ITF',
        'MAXICODE',
        'PDF_417',
        'QR_CODE',
        'UPC_A',
        'UPC_E',
        'UPC_EAN_EXTENSION'
    ].map(nome => formatos[nome]).filter(formato => formato !== undefined);
}

async function configurarFocoAutomatico() {
    try {
        const capacidades = scanner.getRunningTrackCapabilities();
        modosFocoDisponiveis = capacidades.focusMode || [];

        if (modosFocoDisponiveis.includes('continuous')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' }]
            });
        }
    } catch (error) {
        modosFocoDisponiveis = [];
        console.info('[PDV-CAMERA] O foco automático é controlado pelo sistema da câmera.', error);
    }
}

async function focarCamera() {
    if (!scanner?.isScanning) return;

    try {
        const capacidades = scanner.getRunningTrackCapabilities();
        const modosFoco = capacidades.focusMode || modosFocoDisponiveis;

        if (modosFoco.includes('single-shot')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'single-shot' }]
            });
            atualizarStatusCamera('Ajustando foco. Mantenha o código estável.');
            window.setTimeout(() => {
                if (scanner?.isScanning && modosFoco.includes('continuous')) {
                    scanner.applyVideoConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    }).catch(error => console.info('[PDV-CAMERA] Não foi possível restaurar o foco contínuo:', error));
                }
            }, 900);
            return;
        }

        if (modosFoco.includes('continuous')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' }]
            });
            atualizarStatusCamera('Foco automático ativo. Aproxime e mantenha o código estável.');
            return;
        }

        atualizarStatusCamera('O foco é controlado pelo iPhone. Afaste um pouco e aproxime devagar.');
    } catch (error) {
        console.warn('[PDV-CAMERA] O aparelho não permite ajuste manual do foco:', error);
        atualizarStatusCamera('Foco controlado pelo aparelho. Afaste um pouco e aproxime devagar.');
    }
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
    document.getElementById('camera-codigo').value = 'Aguardando leitura...';
    document.getElementById('camera-leitura-status').textContent = 'Nenhum código capturado';
    document.getElementById('camera-produto-status').textContent = 'Aguardando leitura';
    document.getElementById('camera-produto-status').className = 'rounded-full bg-slate-800 px-2 py-1 text-[9px] font-bold uppercase text-slate-400';
    document.getElementById('camera-produto-nome').textContent = 'Leia um código para consultar o produto';
    document.getElementById('camera-produto-categoria').textContent = 'Categoria: —';
    document.getElementById('camera-produto-estoque').textContent = '—';
    document.getElementById('camera-produto-unidade').textContent = 'Unidade: —';
    document.getElementById('camera-produto-preco').textContent = '—';
    document.getElementById('camera-integracao-status').textContent = 'Nenhum produto adicionado';

    const formatosToSupport = obterFormatosSuportados();
    const config = {
        fps: 10,
        qrbox: false,
        disableFlip: false,
        videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 30 }
        }
    };
    if (formatosToSupport?.length) config.formatsToSupport = formatosToSupport;
    try {
        await scanner.start(
            { facingMode: { ideal: 'environment' } },
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
window.focarCameraScanner = focarCamera;
window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;
