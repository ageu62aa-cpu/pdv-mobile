/**
 * Leitor contínuo de códigos de barras integrado ao modal do PDV.
 */

const MODAL_ID = 'modalCamera';
const READER_ID = 'reader';
let scanner = null;
let cameraStartInProgress = false;
let leituraBloqueada = false;
let codigoEmProcessamento = null;
let codigoPendente = null;
let ultimoCodigoLido = null;
let ultimaLeituraEm = 0;
let capturaCodigoCallback = null;
let modosFocoDisponiveis = [];
let focoContinuoAtivo = false;
let focoAlvoTimer = null;
let focoPonteiroInicial = null;
let contextoAudio = null;
let zoomNativoDisponivel = false;
let leitorTecladoInicializado = false;
let cameraSession = 0;
const intervaloAntiDuplicacaoMs = 700;

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

async function processarLeitura(codigo, session = cameraSession) {
    if (session !== cameraSession) return;
    const agora = Date.now();
    if (leituraBloqueada) {
        if (codigo !== codigoEmProcessamento && codigo !== codigoPendente) {
            codigoPendente = codigo;
        }
        return;
    }
    if (codigo === ultimoCodigoLido && agora - ultimaLeituraEm < intervaloAntiDuplicacaoMs) return;

    leituraBloqueada = true;
    codigoEmProcessamento = codigo;
    ultimoCodigoLido = codigo;
    ultimaLeituraEm = agora;
    const reader = document.getElementById(READER_ID);
    reader?.classList.add('barcode-detected');
    window.setTimeout(() => reader?.classList.remove('barcode-detected'), 700);
    tocarBipeLeitura();
    const codigoInput = document.getElementById('camera-codigo');
    const leituraStatus = document.getElementById('camera-leitura-status');
    if (codigoInput) codigoInput.value = codigo;
    if (leituraStatus) leituraStatus.textContent = `${codigo.length} dígitos identificados`;

    try {
        if (capturaCodigoCallback) {
            const callback = capturaCodigoCallback;
            capturaCodigoCallback = null;
            atualizarStatusCamera('Código capturado. Fechando o leitor...');
            try {
                callback(codigo);
            } finally {
                await pararCamera();
                document.getElementById('formProdCodigo')?.focus();
            }
            return;
        }

        if (typeof window.buscarProdutoPorCodigoScanner !== 'function') {
            throw new Error('A consulta de produtos do caixa ainda não está disponível.');
        }
        const produto = await window.buscarProdutoPorCodigoScanner(codigo);
        if (produto) {
            const produtoStatus = document.getElementById('camera-produto-status');
            const produtoNome = document.getElementById('camera-produto-nome');
            if (produtoStatus) {
                produtoStatus.textContent = 'Cadastrado · estoque atualizado';
                produtoStatus.className = 'rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-400';
            }
            if (produtoNome) produtoNome.textContent = produto.nome || 'Produto sem descrição';
            const categoria = document.getElementById('camera-produto-categoria');
            if (categoria) categoria.textContent = `Categoria: ${produto.categoria || 'Não informada'}`;
            const estoque = document.getElementById('camera-produto-estoque');
            if (estoque) estoque.textContent = Number(produto.estoque || 0).toLocaleString('pt-BR');
            const unidade = document.getElementById('camera-produto-unidade');
            if (unidade) unidade.textContent = `Unidade: ${produto.unidade || 'UN'}`;
            const preco = document.getElementById('camera-produto-preco');
            if (preco) preco.textContent = Number(produto.preco_venda || produto.preco || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            if (typeof window.adicionarProdutoAoCarrinho === 'function') {
                window.adicionarProdutoAoCarrinho(produto);
            } else if (typeof window.adicionarProdutoComQtd === 'function') {
                window.adicionarProdutoComQtd(produto);
            } else if (typeof window.adicionarItemVendaPorObjeto === 'function') {
                window.adicionarItemVendaPorObjeto(JSON.stringify(produto).replace(/"/g, '&quot;'));
            } else {
                throw new Error('A função de inclusão de produtos no carrinho não está disponível.');
            }
            const integracaoStatus = document.getElementById('camera-integracao-status');
            if (integracaoStatus) integracaoStatus.textContent = 'Produto enviado ao caixa';
            atualizarStatusCamera('Produto identificado e enviado ao caixa.');
        } else {
            const produtoStatus = document.getElementById('camera-produto-status');
            if (produtoStatus) {
                produtoStatus.textContent = 'Não cadastrado';
                produtoStatus.className = 'rounded-full bg-amber-500/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-400';
            }
            const produtoNome = document.getElementById('camera-produto-nome');
            if (produtoNome) produtoNome.textContent = 'Produto não encontrado no cadastro';
            ['camera-produto-categoria', 'camera-produto-estoque', 'camera-produto-unidade', 'camera-produto-preco'].forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.textContent = '—';
            });
            const integracaoStatus = document.getElementById('camera-integracao-status');
            if (integracaoStatus) integracaoStatus.textContent = 'Não adicionado';
            atualizarStatusCamera(`Código ${codigo} não localizado no cadastro.`, true);
        }
    } catch (error) {
        if (session !== cameraSession) return;
        const detalheErro = error instanceof Error ? error.message : String(error);
        atualizarStatusCamera(`Erro ao consultar o estoque: ${detalheErro}`, true);
        const produtoStatus = document.getElementById('camera-produto-status');
        if (produtoStatus) {
            produtoStatus.textContent = 'Erro na consulta';
            produtoStatus.className = 'rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-bold uppercase text-red-400';
        }
        const integracaoStatus = document.getElementById('camera-integracao-status');
        if (integracaoStatus) integracaoStatus.textContent = 'Não adicionado';
        console.error('[PDV-CAMERA] Erro ao consultar/adicionar produto:', error);
    } finally {
        if (session === cameraSession) {
            leituraBloqueada = false;
            codigoEmProcessamento = null;
            if (scanner?.isScanning) {
                atualizarStatusCamera('Leitor contínuo ativo. Aponte para outro código.');
                const proximoCodigo = codigoPendente;
                codigoPendente = null;
                if (proximoCodigo && proximoCodigo !== ultimoCodigoLido) {
                    window.setTimeout(() => { void processarLeitura(proximoCodigo, session); }, 0);
                }
            }
        }
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

function atualizarBotaoFoco(ativo, texto = 'Ajustar foco') {
    const botao = document.getElementById('camera-focus-button');
    if (!botao) return;
    botao.setAttribute('aria-pressed', String(ativo));
    botao.classList.toggle('camera-focus-active', ativo);
    botao.title = texto;
    botao.setAttribute('aria-label', texto);
}

function mostrarMolduraFoco(left, top, width, height) {
    const container = document.getElementById(READER_ID);
    if (!container) return;

    let moldura = container.querySelector('.camera-focus-target');
    if (!moldura) {
        moldura = document.createElement('span');
        moldura.className = 'camera-focus-target';
        moldura.setAttribute('aria-hidden', 'true');
        container.append(moldura);
    }

    Object.assign(moldura.style, {
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`
    });
    moldura.classList.remove('camera-focus-target-active');
    void moldura.offsetWidth;
    moldura.classList.add('camera-focus-target-active');
    window.clearTimeout(focoAlvoTimer);
    focoAlvoTimer = window.setTimeout(() => {
        moldura.classList.remove('camera-focus-target-active');
    }, 1800);
}

function obterPontoDaCamera(video, clientX, clientY) {
    const bounds = video.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !video.videoWidth || !video.videoHeight) return null;
    const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;
    const cropX = (renderedWidth - bounds.width) / 2;
    const cropY = (renderedHeight - bounds.height) / 2;
    return {
        x: Math.min(1, Math.max(0, (clientX - bounds.left + cropX) / renderedWidth)),
        y: Math.min(1, Math.max(0, (clientY - bounds.top + cropY) / renderedHeight))
    };
}

function registrarInicioToqueFoco(evento) {
    if (!(evento.target instanceof Element) || !(evento.target.closest('video'))) return;
    focoPonteiroInicial = { x: evento.clientX, y: evento.clientY };
    evento.target.setPointerCapture?.(evento.pointerId);
}

async function focarCameraNaPosicao(evento) {
    if (!scanner?.isScanning || !focoPonteiroInicial || !(evento.target instanceof Element)) return;
    const inicio = focoPonteiroInicial;
    focoPonteiroInicial = null;
    const container = document.getElementById(READER_ID);
    const video = evento.target.closest('video');
    if (!container || !video) return;
    const startPoint = obterPontoDaCamera(video, inicio.x, inicio.y);
    const endPoint = obterPontoDaCamera(video, evento.clientX, evento.clientY);
    if (!startPoint || !endPoint) return;
    const didDrag = Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) > 18;
    const containerBounds = container.getBoundingClientRect();
    if (!containerBounds.width || !containerBounds.height) return;
    const startX = Math.min(1, Math.max(0, (inicio.x - containerBounds.left) / containerBounds.width));
    const startY = Math.min(1, Math.max(0, (inicio.y - containerBounds.top) / containerBounds.height));
    const endX = Math.min(1, Math.max(0, (evento.clientX - containerBounds.left) / containerBounds.width));
    const endY = Math.min(1, Math.max(0, (evento.clientY - containerBounds.top) / containerBounds.height));
    const defaultWidth = Math.min(0.78, 250 / containerBounds.width);
    const defaultHeight = Math.min(0.5, 120 / containerBounds.height);
    const width = didDrag ? Math.max(Math.abs(endX - startX), 52 / containerBounds.width) : defaultWidth;
    const height = didDrag ? Math.max(Math.abs(endY - startY), 36 / containerBounds.height) : defaultHeight;
    const centerX = didDrag ? (startX + endX) / 2 : endX;
    const centerY = didDrag ? (startY + endY) / 2 : endY;
    const left = Math.min(1 - width, Math.max(0, centerX - width / 2));
    const top = Math.min(1 - height, Math.max(0, centerY - height / 2));
    mostrarMolduraFoco(left, top, width, height);
    const focusPoint = didDrag
        ? obterPontoDaCamera(video, (inicio.x + evento.clientX) / 2, (inicio.y + evento.clientY) / 2)
        : endPoint;
    if (!focusPoint) return;

    try {
        const supported = navigator.mediaDevices.getSupportedConstraints?.() || {};
        const capacidades = scanner.getRunningTrackCapabilities();
        const modosFoco = capacidades.focusMode || modosFocoDisponiveis;
        const focoContinuoAnterior = focoContinuoAtivo;
        if (supported.pointsOfInterest) {
            try {
                await scanner.applyVideoConstraints({
                    advanced: [{ pointsOfInterest: [{ x: focusPoint.x, y: focusPoint.y }] }]
                });
            } catch (error) {
                console.info('[PDV-CAMERA] O dispositivo recusou o ponto de foco solicitado:', error);
            }
        }

        if (modosFoco.includes('single-shot')) {
            await scanner.applyVideoConstraints({ advanced: [{ focusMode: 'single-shot' }] });
        } else if (modosFoco.includes('continuous')) {
            await scanner.applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }

        atualizarBotaoFoco(true, 'Foco direcionado para o ponto selecionado');
        atualizarStatusCamera(didDrag
            ? 'Moldura posicionada sobre o código. Ajustando o foco para a captura.'
            : 'Moldura automática posicionada. Ajustando o foco; mantenha o código estável.');
        window.setTimeout(() => {
            if (scanner?.isScanning) {
                if (focoContinuoAnterior && modosFoco.includes('single-shot')) {
                    void scanner.applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] })
                        .then(() => {
                            focoContinuoAtivo = true;
                            atualizarBotaoFoco(true, 'Foco contínuo ativo; toque para reajustar');
                        })
                        .catch(error => console.info('[PDV-CAMERA] Não foi possível restaurar o foco contínuo:', error));
                } else {
                    atualizarBotaoFoco(focoContinuoAtivo, focoContinuoAtivo
                        ? 'Foco contínuo ativo; toque para reajustar'
                        : 'Ajustar foco');
                }
            }
        }, 700);
    } catch (error) {
        console.info('[PDV-CAMERA] O dispositivo não permite focar no ponto selecionado:', error);
        atualizarBotaoFoco(false, 'A câmera controla o foco automaticamente');
        atualizarStatusCamera('Ponto selecionado. A câmera controla o foco; aproxime ou afaste o código devagar.');
    }
}

async function configurarFocoAutomatico() {
    try {
        const capacidades = scanner.getRunningTrackCapabilities();
        modosFocoDisponiveis = capacidades.focusMode || [];

        if (modosFocoDisponiveis.includes('continuous')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' }]
            });
            focoContinuoAtivo = true;
            atualizarBotaoFoco(true, 'Foco contínuo ativo; toque para reajustar');
            return;
        }
        focoContinuoAtivo = false;
        atualizarBotaoFoco(false);
    } catch (error) {
        modosFocoDisponiveis = [];
        focoContinuoAtivo = false;
        atualizarBotaoFoco(false);
        console.info('[PDV-CAMERA] O foco automático é controlado pelo sistema da câmera.', error);
    }
}

function configurarZoomCamera() {
    const wrapper = document.getElementById('camera-zoom-wrapper');
    const controle = document.getElementById('camera-zoom');
    const valorZoom = document.getElementById('camera-zoom-value');
    const botaoDiminuirZoom = document.getElementById('camera-zoom-out');
    const botaoAumentarZoom = document.getElementById('camera-zoom-in');

    let faixaZoom;
    try {
        faixaZoom = scanner.getRunningTrackCapabilities().zoom;
    } catch (error) {
        console.info('[PDV-CAMERA] O aparelho não expõe controle de zoom.', error);
    }

    if (!wrapper || !controle || !valorZoom) {
        return;
    }

    zoomNativoDisponivel = Boolean(faixaZoom && faixaZoom.max > faixaZoom.min);
    if (!zoomNativoDisponivel) {
        faixaZoom = { min: 1, max: 3, step: 0.1 };
        atualizarStatusCamera('Zoom digital disponível para aproximar a imagem.');
    }
    if (faixaZoom.max <= faixaZoom.min) {
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
        atualizarBotoesZoom(Number(controle.value), {
            min: Number(controle.min),
            max: Number(controle.max)
        });
    };
    controle.onchange = async () => {
        await aplicarZoomCamera(Number(controle.value));
    };
    if (botaoDiminuirZoom) {
        botaoDiminuirZoom.disabled = Number(controle.value) <= faixaZoom.min;
        botaoDiminuirZoom.onclick = () => alterarZoomCamera(-1);
    }
    if (botaoAumentarZoom) {
        botaoAumentarZoom.disabled = Number(controle.value) >= faixaZoom.max;
        botaoAumentarZoom.onclick = () => alterarZoomCamera(1);
    }
}

function atualizarBotoesZoom(valor, faixaZoom) {
    const botaoDiminuirZoom = document.getElementById('camera-zoom-out');
    const botaoAumentarZoom = document.getElementById('camera-zoom-in');
    if (botaoDiminuirZoom) botaoDiminuirZoom.disabled = valor <= faixaZoom.min;
    if (botaoAumentarZoom) botaoAumentarZoom.disabled = valor >= faixaZoom.max;
}

async function aplicarZoomCamera(valor) {
    const controle = document.getElementById('camera-zoom');
    const valorZoom = document.getElementById('camera-zoom-value');
    const botaoDiminuirZoom = document.getElementById('camera-zoom-out');
    const botaoAumentarZoom = document.getElementById('camera-zoom-in');
    if (!scanner?.isScanning || !controle || !valorZoom) return;

    const valorAnterior = Number(controle.value);
    let proximoValor = Math.max(Number(controle.min), Math.min(Number(controle.max), valor));
    controle.value = String(proximoValor);
    valorZoom.textContent = `${proximoValor.toFixed(1)}×`;
    if (botaoDiminuirZoom) botaoDiminuirZoom.disabled = true;
    if (botaoAumentarZoom) botaoAumentarZoom.disabled = true;

    try {
        if (zoomNativoDisponivel) {
            try {
                await scanner.applyVideoConstraints({
                    advanced: [{ zoom: proximoValor }]
                });
            } catch (error) {
                console.info('[PDV-CAMERA] Zoom nativo indisponível; ativando zoom digital.', error);
                zoomNativoDisponivel = false;
                controle.min = '1';
                controle.max = '3';
                controle.step = '0.1';
                proximoValor = Math.max(1, Math.min(3, proximoValor));
                controle.value = String(proximoValor);
                valorZoom.textContent = `${proximoValor.toFixed(1)}×`;
                aplicarZoomDigital(proximoValor);
            }
        } else {
            aplicarZoomDigital(proximoValor);
        }
        atualizarStatusCamera(`Zoom ajustado para ${proximoValor.toFixed(1)}×.`);
    } catch (error) {
        controle.value = String(valorAnterior);
        valorZoom.textContent = `${valorAnterior.toFixed(1)}×`;
        console.warn('[PDV-CAMERA] O aparelho não permite alterar o zoom da câmera:', error);
        atualizarStatusCamera('Zoom não compatível com este aparelho.', true);
    } finally {
        atualizarBotoesZoom(Number(controle.value), {
            min: Number(controle.min),
            max: Number(controle.max)
        });
    }
}

function aplicarZoomDigital(zoom) {
    const videoElement = document.querySelector(`#${READER_ID} video`);
    if (videoElement) {
        videoElement.style.transform = `scale(${zoom})`;
        videoElement.style.transformOrigin = 'center';
    }
}

function alterarZoomCamera(direcao) {
    const controle = document.getElementById('camera-zoom');
    if (!controle) return;

    const passo = Number(controle.step) || 0.1;
    void aplicarZoomCamera(Number(controle.value) + passo * direcao);
}

async function ativarFocoAutomatico() {
    if (!scanner?.isScanning) return;

    try {
        const modosFoco = scanner.getRunningTrackCapabilities().focusMode || modosFocoDisponiveis;
        if (modosFoco.includes('continuous')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' }]
            });
            focoContinuoAtivo = true;
            atualizarBotaoFoco(true, 'Foco contínuo ativo; toque para reajustar');
            atualizarStatusCamera('Foco automático contínuo ativo. O leitor continua procurando códigos.');
            return;
        }
        if (modosFoco.includes('single-shot')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'single-shot' }]
            });
            atualizarBotaoFoco(true, 'Foco reajustado');
            window.setTimeout(() => {
                if (scanner?.isScanning) atualizarBotaoFoco(false);
            }, 600);
            atualizarStatusCamera('Foco automático ajustado. Mantenha o código estável.');
            return;
        }

        atualizarBotaoFoco(true, 'A câmera controla o foco automaticamente');
        window.setTimeout(() => {
            if (scanner?.isScanning) atualizarBotaoFoco(false);
        }, 600);
        atualizarStatusCamera('A câmera controla o foco. Toque na imagem e mantenha o código estável.');
    } catch (error) {
        console.warn('[PDV-CAMERA] Não foi possível ativar o foco automático:', error);
        atualizarBotaoFoco(true, 'Toque para reajustar o foco');
        window.setTimeout(() => {
            if (scanner?.isScanning) atualizarBotaoFoco(false);
        }, 600);
        atualizarStatusCamera('O foco é controlado pelo dispositivo.', true);
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
            atualizarBotaoFoco(true, 'Foco reajustado');
            atualizarStatusCamera('Ajustando foco. Mantenha o código estável.');
            window.setTimeout(() => {
                if (scanner?.isScanning && modosFoco.includes('continuous')) {
                    void scanner.applyVideoConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    }).then(() => {
                        focoContinuoAtivo = true;
                        atualizarBotaoFoco(true, 'Foco contínuo ativo; toque para reajustar');
                    })
                        .catch(error => console.info('[PDV-CAMERA] Não foi possível restaurar o foco contínuo:', error));
                } else if (scanner?.isScanning) {
                    focoContinuoAtivo = false;
                    atualizarBotaoFoco(false);
                }
            }, 500);
            return;
        }

        if (modosFoco.includes('continuous')) {
            await scanner.applyVideoConstraints({
                advanced: [{ focusMode: 'continuous' }]
            });
            atualizarBotaoFoco(true, 'Foco contínuo ativo; toque para reajustar');
            atualizarStatusCamera('Foco automático ativo. Aproxime e mantenha o código estável.');
            return;
        }

        atualizarBotaoFoco(true, 'A câmera controla o foco automaticamente');
        window.setTimeout(() => {
            if (scanner?.isScanning) atualizarBotaoFoco(false);
        }, 600);
        atualizarStatusCamera('O foco é controlado pelo dispositivo. Afaste um pouco e aproxime devagar.');
    } catch (error) {
        console.warn('[PDV-CAMERA] O aparelho não permite ajuste manual do foco:', error);
        atualizarBotaoFoco(true, 'Toque para reajustar o foco');
        window.setTimeout(() => {
            if (scanner?.isScanning) atualizarBotaoFoco(false);
        }, 600);
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
    modal.style.display = 'flex';
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

    container.onpointerdown = registrarInicioToqueFoco;
    container.onpointerup = evento => { void focarCameraNaPosicao(evento); };
    const codigoInput = document.getElementById('camera-codigo');
    if (codigoInput) codigoInput.value = 'Aguardando leitura...';
    const leituraStatus = document.getElementById('camera-leitura-status');
    if (leituraStatus) leituraStatus.textContent = 'Nenhum código capturado';
    const produtoStatus = document.getElementById('camera-produto-status');
    if (produtoStatus) {
        produtoStatus.textContent = 'Aguardando leitura';
        produtoStatus.className = 'rounded-full bg-slate-800 px-2 py-1 text-[9px] font-bold uppercase text-slate-400';
    }
    const produtoNome = document.getElementById('camera-produto-nome');
    if (produtoNome) produtoNome.textContent = 'Leia um código para consultar o produto';
    ['camera-produto-categoria', 'camera-produto-estoque', 'camera-produto-unidade', 'camera-produto-preco'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = '—';
    });
    const integracaoStatus = document.getElementById('camera-integracao-status');
    if (integracaoStatus) integracaoStatus.textContent = 'Nenhum produto adicionado';

    Object.assign(container.style, {
        display: 'block',
        width: '100%',
        minHeight: '300px',
        position: 'relative'
    });

    const session = ++cameraSession;
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
            codigo => { void processarLeitura(codigo, session); },
            () => {}
        );
    } catch (errAmbiente) {
        console.warn('[PDV-CAMERA] Tentando inicialização genérica de vídeo...', errAmbiente);
        await scanner.start({}, config, codigo => { void processarLeitura(codigo, session); }, () => {});
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

export async function escanearCameraAdmin(campoCodigo = document.getElementById('formProdCodigo')) {
    if (!campoCodigo || typeof campoCodigo.dispatchEvent !== 'function') {
        throw new Error('O campo de código do produto não está disponível.');
    }

    capturaCodigoCallback = codigo => {
        campoCodigo.value = codigo;
        campoCodigo.dispatchEvent(new Event('input', { bubbles: true }));
        campoCodigo.dispatchEvent(new Event('change', { bubbles: true }));
    };

    await abrirLeitorCamera();
    if (!scanner?.isScanning) capturaCodigoCallback = null;
}

export async function pararCamera() {
    cameraSession++;
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
    codigoEmProcessamento = null;
    codigoPendente = null;
    ultimoCodigoLido = null;
    ultimaLeituraEm = 0;
    capturaCodigoCallback = null;
    modosFocoDisponiveis = [];
    zoomNativoDisponivel = false;
    document.getElementById('camera-zoom-wrapper')?.classList.add('hidden');
    const reader = document.getElementById(READER_ID);
    if (reader) reader.onpointerdown = null;
    if (reader) reader.onpointerup = null;
    focoPonteiroInicial = null;
    window.clearTimeout(focoAlvoTimer);
    focoContinuoAtivo = false;
    modal?.classList.add('hidden');
    if (modal) modal.style.display = 'none';
}

export async function fecharLeitorCamera() {
    await pararCamera();
}

export function inicializarLeitorTecladoPistola() {
    if (leitorTecladoInicializado) return;
    leitorTecladoInicializado = true;

    const restaurarFocoBusca = () => {
        if (document.visibilityState === 'hidden') return;
        const modalCamera = document.getElementById(MODAL_ID);
        if (modalCamera && !modalCamera.classList.contains('hidden')) return;

        const ativo = document.activeElement;
        if (ativo && ativo !== document.body && ativo !== document.documentElement) return;

        const input = document.getElementById('inputBusca');
        if (!input) return;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };

    window.addEventListener('focus', restaurarFocoBusca);
    document.addEventListener('visibilitychange', restaurarFocoBusca);
    console.info('[PDV-LEITOR] Entrada por teclado para leitores USB/Bluetooth ativa.');
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
window.escanearCameraAdmin = escanearCameraAdmin;
window.fecharLeitorCamera = fecharLeitorCamera;
window.focarCameraScanner = focarCamera;
window.ativarFocoAutomaticoScanner = ativarFocoAutomatico;
window.inicializarLeitorTecladoPistola = inicializarLeitorTecladoPistola;