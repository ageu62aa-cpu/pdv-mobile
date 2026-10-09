/**
 * Leitor contínuo de códigos de barras integrado ao modal do PDV.
 */

const MODAL_ID = 'modalCamera';
const READER_ID = 'reader';
let scanner = null;
let cameraStartInProgress = false;
let leituraBloqueada = false;
let modosFocoDisponiveis = [];
let contextoAudio = null;

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

async function prepararAudioLeitura() {
    try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) return;

        if (!contextoAudio) contextoAudio = new AudioContextConstructor();
        if (contextoAudio.state === 'suspended') await contextoAudio.resume();
    } catch (error) {
        console.warn('[PDV-CAMERA] Não foi possível preparar o áudio do leitor:', error);
    }
}

function tocarBipeLeitura() {
    try {
        navigator.vibrate?.(45);
    } catch (error) {
        console.info('[PDV-CAMERA] Vibração de confirmação indisponível:', error);
    }

    try {
        if (!contextoAudio || contextoAudio.state !== 'running') return;

        const audioContext = contextoAudio;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 1800;
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.14);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
        console.warn('[PDV-CAMERA] Bipe de confirmação indisponível:', error);
    }
}

async function processarLeitura(codigo) {
    if (leituraBloqueada) return;

    leituraBloqueada = true;
    const reader = document.getElementById(READER_ID);
    reader?.classList.add('barcode-detected');
    window.setTimeout(() => reader?.classList.remove('barcode-detected'), 700);
    tocarBipeLeitura();
    const codigoInput = document.getElementById('camera-codigo');
    const leituraStatus = document.getElementById('camera-leitura-status');
    if (codigoInput) codigoInput.value = codigo;
    if (leituraStatus) leituraStatus.textContent = `${codigo.length} dígitos identificados`;

    try {
        if (typeof window.buscarProdutoPorCodigoScanner !== 'function') {
            throw new Error('A consulta de produtos do caixa ainda não está disponível.');
        }
        const produto = await window.buscarProdutoPorCodigoScanner(codigo);
        if (produto) {
            document.getElementById('camera-produto-status').textContent = 'Cadastrado · estoque atualizado';
            document.getElementById('camera-produto-status').className = 'rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-400';
            document.getElementById('camera-produto-nome').textContent = produto.nome || 'Produto sem descrição';
            document.getElementById('camera-produto-categoria').textContent = `Categoria: ${produto.categoria || 'Não informada'}`;
            document.getElementById('camera-produto-estoque').textContent = Number(produto.estoque || 0).toLocaleString('pt-BR');
            document.getElementById('camera-produto-unidade').textContent = `Unidade: ${produto.unidade || 'UN'}`;
            document.getElementById('camera-produto-preco').textContent = Number(produto.preco_venda || produto.preco || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

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
    } catch (error) {
        atualizarStatusCamera('Falha ao consultar o produto no estoque.', true);
        document.getElementById('camera-produto-status').textContent = 'Erro na consulta';
        document.getElementById('camera-produto-status').className = 'rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-bold uppercase text-red-400';
        document.getElementById('camera-integracao-status').textContent = 'Não adicionado';
        console.error('[PDV-CAMERA] Erro ao consultar/adicionar produto:', error);
    } finally {
        window.setTimeout(() => {
            leituraBloqueada = false;
            if (scanner?.isScanning) {
                atualizarStatusCamera('Leitor contínuo ativo. Aponte para outro código.');
            }
        }, 1200);
    }
}

function obterFormatosSuportados() {
    const formatos = window.Html5QrcodeSupportedFormats;
    if (!formatos) return undefined;

    return [
        'AZTEC', 'CODABAR', 'CODE_39', 'CODE_93', 'CODE_128',
        'DATA_MATRIX', 'EAN_8', 'EAN_13', 'ITF', 'MAXICODE',
        'PDF_417', 'QR_CODE', 'UPC_A', 'UPC_E', 'UPC_EAN_EXTENSION'
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

function configurarZoomCamera() {
    const wrapper = document.getElementById('camera-zoom-wrapper');
    const controle = document.getElementById('camera-zoom');
    const valorZoom = document.getElementById('camera-zoom-value');

    let faixaZoom;
    try {
        faixaZoom = scanner.getRunningTrackCapabilities().zoom;
    } catch (error) {
        console.info('[PDV-CAMERA] O aparelho não expõe controle de zoom.', error);
    }

    if (!faixaZoom || !wrapper || !controle || !valorZoom || faixaZoom.max <= faixaZoom.min) {
        wrapper?.classList.add('hidden');
        return;
    }

    controle.min = String(faixaZoom.min);
    controle.max = String(faixaZoom.max);
    controle.step = String(faixaZoom.step || Math.max((faixaZoom.max - faixaZoom.min) / 20, 0.1));
    controle.value = String(Math.max(faixaZoom.min, Math.min(1, faixaZoom.max)));
    valorZoom.textContent = `${Number(controle.value).toFixed(1)}×`;
    wrapper.classList.remove('hidden');
    wrapper.classList.add('flex');

    controle.oninput = () => {
        valorZoom.textContent = `${Number(controle.value).toFixed(1)}×`;
    };
    controle.onchange = async () => {
        try {
            await scanner.applyVideoConstraints({
                advanced: [{ zoom: Number(controle.value) }]
            });
        } catch (error) {
            console.warn('[PDV-CAMERA] O aparelho não permite alterar o zoom da câmera:', error);
            atualizarStatusCamera('Zoom não compatível com este aparelho.');
        }
    };
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

        atualizarStatusCamera('O foco é controlado pelo dispositivo. Afaste um pouco e aproxime devagar.');
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
    atualizarStatusCamera('Solicitando acesso à câmera traseira...');

    if (scanner?.isScanning) {
        atualizarStatusCamera('Leitor contínuo ativo. Aponte para um código.');
        return;
    }

    if (!scanner) {
        scanner = new window.Html5Qrcode(READER_ID, {
            verbose: false,
            useBarCodeDetectorIfSupported: false
        });
    }

    container.onclick = focarCamera;
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

    Object.assign(container.style, {
        display: 'block',
        width: '100%',
        minHeight: '300px',
        position: 'relative'
    });

    const formatosToSupport = obterFormatosSuportados();
    const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(viewfinderHeight * 0.45)
        }),
        disableFlip: false,
        videoConstraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: 'environment' }
        }
    };
    if (formatosToSupport?.length) config.formatsToSupport = formatosToSupport;

    // Prioriza a câmera traseira e recorre a uma câmera padrão quando necessário.
    try {
        await scanner.start(
            { facingMode: { ideal: 'environment' } },
            config,
            processarLeitura,
            () => {}
        );
    } catch (errAmbiente) {
        console.warn('[PDV-CAMERA] Tentando inicialização genérica de vídeo...', errAmbiente);
        await scanner.start({}, config, processarLeitura, () => {});
    }

    const videoElement = container.querySelector('video');
    if (videoElement) {
        videoElement.style.objectFit = 'cover';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.backgroundColor = '#0b0f19';
    }

    const configuracoesVideo = scanner.getRunningTrackSettings();
    const botaoFoco = document.getElementById('camera-focus-button');
    if (botaoFoco) botaoFoco.disabled = false;
    await configurarFocoAutomatico();
    configurarZoomCamera();
    atualizarStatusCamera(configuracoesVideo.facingMode === 'environment'
        ? 'Câmera traseira ativa. Centralize o código na moldura.'
        : 'Câmera ativa. Centralize o código na moldura.');
    console.info('[PDV-CAMERA] Câmera iniciada com sucesso.', configuracoesVideo);
}

export async function abrirLeitorCamera() {
    if (cameraStartInProgress) return;
    cameraStartInProgress = true;

    const modal = document.getElementById(MODAL_ID);
    modal?.classList.remove('hidden');
    window.addEventListener('keydown', tratarEscapeCamera);

    try {
        const inicializacaoCamera = iniciarLeitura();
        void prepararAudioLeitura();
        await inicializacaoCamera;
    } catch (error) {
        console.error('[PDV-CAMERA] Não foi possível iniciar a câmera:', error);
        atualizarStatusCamera(descreverErroCamera(error), true);
        if (scanner && !scanner.isScanning) {
            try {
                await scanner.clear();
            } catch (clearError) {
                console.warn('[PDV-CAMERA] Falha ao limpar o scanner após erro de inicialização:', clearError);
            }
            scanner = null;
        }
    } finally {
        cameraStartInProgress = false;
    }
}

function descreverErroCamera(error) {
    const mensagem = String(error?.message || error || '').toLowerCase();
    if (error?.name === 'NotAllowedError'
        || error?.name === 'PermissionDeniedError'
        || /permission denied|notallowederror|permission dismissed/.test(mensagem)) {
        return 'Acesso bloqueado. No iPhone: Ajustes > Safari > Câmera, permita o acesso e recarregue esta página.';
    }
    if (error?.name === 'NotFoundError'
        || error?.name === 'OverconstrainedError'
        || /notfounderror|no camera found|requested device not found/.test(mensagem)) {
        return 'Não foi encontrada uma câmera traseira disponível neste aparelho.';
    }
    if (error?.name === 'NotReadableError'
        || error?.name === 'AbortError'
        || /notreadableerror|could not start video source/.test(mensagem)) {
        return 'A câmera está ocupada por outro aplicativo. Feche-o e tente novamente.';
    }
    return error?.message || 'Não foi possível iniciar a câmera. Verifique as permissões do navegador.';
}

export async function pararCamera() {
    const modal = document.getElementById(MODAL_ID);
    window.removeEventListener('keydown', tratarEscapeCamera);

    if (scanner) {
        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            await scanner.clear();
        } catch (error) {
            console.warn('[PDV-CAMERA] Aviso ao limpar o scanner:', error);
        } finally {
            scanner = null;
        }
    }

    leituraBloqueada = false;
    modosFocoDisponiveis = [];
    document.getElementById('camera-zoom-wrapper')?.classList.add('hidden');
    document.getElementById(READER_ID)?.removeAttribute('onclick');
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