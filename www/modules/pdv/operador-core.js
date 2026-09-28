// ==========================================
// MÓDULO DO OPERADOR (operador-core.js)
// ==========================================

import { inicializarSessaoUsuario } from '../services/auth.js'; // Ajusta o caminho conforme a tua estrutura
import { cargoUsuarioAtual } from '../core/state.js';
import { verificarStatusCaixaServidor, iniciarRealtimeCaixa } from './caixa-core.js'; // Reaproveita a lógica robusta de vendas

async function iniciarPainelOperador() {
    document.body.style.display = 'none'; // Evita flash visual

    const sessaoOk = await inicializarSessaoUsuario();
    if (!sessaoOk) return;

    // Blindagem opcional: se quiseres garantir que só operadores ou quem tu permitires operem aqui
    console.log(`Sessão iniciada para o cargo: ${cargoUsuarioAtual}`);

    // Libera a tela
    document.body.style.display = 'flex';

    // Dispara as checagens de caixa
    verificarStatusCaixaServidor();
    iniciarRealtimeCaixa();
}

iniciarPainelOperador();