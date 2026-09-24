// ==========================================  
// ORQUESTRADOR DE CÂMERA E PISTOLA (PDV-VS)  
// ==========================================  

import { origemLeitor, setOrigemLeitor, produtosCache } from './state.js';  
import { tratarAdicaoProduto } from './produtos.js';  
import { dispararLeitorNativo, fecharLeitorNativo } from './camera-native.js';
import { iniciarCameraWeb, fecharCameraWeb } from './camera-web.js';

let listenerTecladoGlobal = null;  

// Inicializa o listener global da pistola de código de barras física / teclado  
export function inicializarLeitorTecladoPistola() {  
    if (listenerTecladoGlobal) return;  

    let bufferLeitor = '';  
    let ultimoTempo = Date.now();  

    listenerTecladoGlobal = (e) => {  
        const tempoAtual = Date.now();  

        const modalCam = document.getElementById('modalCamera');  
        if (modalCam && !modalCam.classList.contains('hidden')) return;  

        if (tempoAtual - ultimoTempo > 100) {  
            bufferLeitor = '';  
        }  
        ultimoTempo = tempoAtual;  

        if (e.key === 'Enter') {  
            if (bufferLeitor && bufferLeitor.trim().length > 1) {  
                e.preventDefault();  
                e.stopPropagation();  
                const codigoLido = bufferLeitor.trim();  
                bufferLeitor = '';  
                processarCodigoCapturadoUniversal(codigoLido);  
            }  
        } else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {  
            bufferLeitor += e.key;  
        }  
    };  

    window.addEventListener('keydown', listenerTecladoGlobal);  
}  

// Executado ao abrir leitor na Tela Principal de Vendas (Modo Contínuo / Não fecha sozinho)  
export async function abrirLeitorCamera() {  
    console.log("PDV-VS: Abrindo leitor contínuo para Vendas");  
    setOrigemLeitor('busca');  
    await executarLoopLeituraVendas();  
}  

// Executado ao abrir leitor no Admin (Modo Único / Fechamento Automático)  
export async function escanearCameraAdmin() {  
    console.log("PDV-VS: Abrindo leitor único para Admin");  
    setOrigemLeitor('admin');  
    await gerenciarAberturaLeitorUnico();  
}  

// Executado pelo botão de scan no modal de produtos do admin
export async function abrirLeitorCameraParaCampo() {  
    console.log("PDV-VS: Abrindo leitor para preenchimento de campo específico no Admin");  
    setOrigemLeitor('admin');  
    await gerenciarAberturaLeitorUnico();  
}  

// Loop contínuo exclusivo para Vendas (fica ativo lendo vários produtos seguidos)
async function executarLoopLeituraVendas() {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

    if (isNative) {
        // No nativo, criamos um ciclo contínuo até o utilizador fechar manualmente
        try {
            while (origemLeitor === 'busca') {
                const codigoNativo = await dispararLeitorNativo();
                if (codigoNativo) {
                    processarCodigoCapturadoUniversal(codigoNativo.trim());
                    // Pequena pausa para evitar leitura dupla instantânea do mesmo item
                    await new Promise(resolve => setTimeout(resolve, 800));
                } else {
                    break; // Se cancelou ou fechou a câmara, sai do loop
                }
            }
        } catch (err) {
            console.error("PDV-VS Erro no loop de vendas nativo:", err);
        }
    } else {
        // Fallback Web para Vendas (modo contínuo na web)
        await iniciarCameraWeb((codigoLido) => {
            processarCodigoCapturadoUniversal(codigoLido);
        });
    }
}

// Abertura única para o Admin (fecha logo após ler o código)
async function gerenciarAberturaLeitorUnico() {  
    try {  
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();  

        if (isNative) {  
            const codigoNativo = await dispararLeitorNativo();
            if (codigoNativo) {
                processarCodigoCapturadoUniversal(codigoNativo.trim());
            }
            await fecharLeitorCamera();
            return;
        }  

        await iniciarCameraWeb((codigoLido) => {
            processarCodigoCapturadoUniversal(codigoLido);
            fecharLeitorCamera();
        });  

    } catch (err) {  
        console.error("PDV-VS Erro geral ao gerenciar leitor único:", err);  
        await fecharLeitorCamera();  
    }  
}  

// Processamento unificado direcionando para o Carrinho (Vendas) ou Input (Admin)
function processarCodigoCapturadoUniversal(termoDigitado) {  
    if (!termoDigitado || termoDigitado.length < 1) return;  

    console.log(`PDV-VS: Processando termo [Origem: ${origemLeitor}] ->`, termoDigitado);  
    
    if (origemLeitor === 'busca') {  
        const termoLower = termoDigitado.toLowerCase();  
        
        const produtoEncontrado = produtosCache.find(prod => {  
            const codigoMatch = prod.codigo && prod.codigo.trim().toLowerCase() === termoLower;  
            const nomeMatch = prod.nome && prod.nome.toLowerCase().includes(termoLower);  
            return codigoMatch || nomeMatch;  
        });  

        if (produtoEncontrado) {  
            // Adiciona direto à sacola/carrinho somando o total instantaneamente
            tratarAdicaoProduto(produtoEncontrado);  
        } else {  
            const inputBusca = document.getElementById('inputBusca');  
            if (inputBusca) {  
                inputBusca.value = termoDigitado;  
                inputBusca.focus();  
                inputBusca.dispatchEvent(new Event('input', { bubbles: true }));  
                inputBusca.dispatchEvent(new Event('change', { bubbles: true }));  
            }  
        }  
    } else if (origemLeitor === 'admin') {  
        const inputCodigo = document.getElementById('formCodigo');  
        if (inputCodigo) {  
            inputCodigo.value = termoDigitado;  
            inputCodigo.focus();  
            inputCodigo.dispatchEvent(new Event('input', { bubbles: true }));  
            inputCodigo.dispatchEvent(new Event('change', { bubbles: true }));  
        }  
    }  
}  

export async function fecharLeitorCamera() {  
    setOrigemLeitor(null); // Reseta a origem para quebrar o loop de vendas
    await fecharLeitorNativo();
    await fecharCameraWeb();
}  

window.mostrarDetalhesCompatibilidade = function(sistema) {  
    if (sistema === 'android') {  
        alert("Android: Compatibilidade 100%\n\nO Android consegue capturar com muita eficiência todos os códigos de barras através da câmara.");  
    } else if (sistema === 'ios') {  
        alert("iOS (iPhone): Compatibilidade 100%\n\nCom o motor nativo otimizado do ML Kit, o iPhone lê códigos de barras com máxima precisão e velocidade.");  
    }  
};  

export function renderizarAvisosCompatibilidadeAdmin() {  
    const inputCodigo = document.getElementById('formCodigo');  
    if (!inputCodigo) return;  

    let containerAvisos = document.getElementById('painelAvisosCompatibilidade');  
    if (!containerAvisos) {  
        containerAvisos = document.createElement('div');  
        containerAvisos.id = 'painelAvisosCompatibilidade';  
        containerAvisos.style.cssText = "display: flex; gap: 10px; margin-top: 8px; justify-content: space-between;";  
        
        containerAvisos.innerHTML = '<div onclick="window.mostrarDetalhesCompatibilidade(\'android\')" style="flex: 1; border: 1px solid #d1e7dd; background: #f8f9fa; padding: 6px; border-radius: 6px; text-align: center; cursor: pointer;"><span style="font-size: 16px;">🤖</span><div style="font-size: 11px; font-weight: bold; color: #155724;">Android: 100%</div></div><div onclick="window.mostrarDetalhesCompatibilidade(\'ios\')" style="flex: 1; border: 1px solid #f8f7da; background: #f8f9fa; padding: 6px; border-radius: 6px; text-align: center; cursor: pointer;"><span style="font-size: 16px;">🍏</span><div style="font-size: 11px; font-weight: bold; color: #721c24;">iOS: 100%</div></div>';  
        
        inputCodigo.parentNode.insertBefore(containerAvisos, inputCodigo.nextSibling);  
    }  
}  

setInterval(() => {  
    const modalProduto = document.getElementById('formCodigo');  
    if (modalProduto) {  
        renderizarAvisosCompatibilidadeAdmin();  
    }  
}, 1000);  

inicializarLeitorTecladoPistola();  

window.abrirLeitorCamera = abrirLeitorCamera;  
window.escanearCameraAdmin = escanearCameraAdmin;  
window.abrirLeitorCameraParaCampo = abrirLeitorCameraParaCampo;  
window.fecharLeitorCamera = fecharLeitorCamera;